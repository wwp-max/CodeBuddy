/**
 * 笔记编辑器模块
 * 处理笔记的创建、编辑、预览和管理
 */

class NoteEditor {
    constructor() {
        this.currentNote = null;
        this.notes = [];
        this.isPreviewMode = false;
        this.autoSaveTimer = null;
        this.searchQuery = '';
        this.init();
    }

    async init() {
        await this.loadNotes();
        this.bindEvents();
        this.setupAutoSave();
        this.render();
    }

    async loadNotes() {
        try {
            this.notes = await window.storageManager.getNotes();
            this.notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } catch (error) {
            console.error('加载笔记失败:', error);
            this.notes = [];
        }
    }

    bindEvents() {
        // 新建笔记按钮
        document.getElementById('newNoteBtn')?.addEventListener('click', () => {
            this.createNewNote();
        });

        // 保存笔记按钮
        document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
            this.saveCurrentNote();
        });

        // 预览切换按钮
        document.getElementById('previewToggle')?.addEventListener('click', () => {
            this.togglePreview();
        });

        // AI分析按钮
        document.getElementById('aiAnalyzeBtn')?.addEventListener('click', () => {
            this.analyzeWithAI();
        });

        // 搜索框
        document.getElementById('noteSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // 笔记编辑器
        const editor = document.getElementById('noteEditor');
        if (editor) {
            editor.addEventListener('input', () => {
                this.handleEditorChange();
            });

            editor.addEventListener('keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });
        }

        // 标题输入框
        document.getElementById('noteTitle')?.addEventListener('input', () => {
            this.handleTitleChange();
        });

        // 工具栏按钮
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleToolbarAction(e.target.dataset.action);
            });
        });

        // 监听自定义事件
        document.addEventListener('openNote', (event) => {
            this.openNote(event.detail.noteId);
        });
    }

    setupAutoSave() {
        // 每30秒自动保存
        setInterval(() => {
            if (this.currentNote && this.hasUnsavedChanges()) {
                this.saveCurrentNote(true); // 静默保存
            }
        }, 30000);
    }

    createNewNote() {
        // 如果当前有未保存的更改，提示用户
        if (this.hasUnsavedChanges()) {
            if (!confirm('当前笔记有未保存的更改，是否继续创建新笔记？')) {
                return;
            }
        }

        this.currentNote = {
            id: null,
            title: '',
            content: '',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.updateEditor();
        this.updateNotesList();
        
        // 聚焦到标题输入框
        document.getElementById('noteTitle')?.focus();
    }

    async openNote(noteId) {
        try {
            const note = await window.storageManager.getNote(noteId);
            if (!note) {
                console.error('笔记不存在:', noteId);
                return;
            }

            // 如果当前有未保存的更改，提示用户
            if (this.hasUnsavedChanges()) {
                if (!confirm('当前笔记有未保存的更改，是否继续打开其他笔记？')) {
                    return;
                }
            }

            this.currentNote = note;
            this.updateEditor();
            this.updateNotesList();
            
            // 切换到笔记编辑面板
            const event = new CustomEvent('switchTab', {
                detail: { tab: 'notes' }
            });
            document.dispatchEvent(event);

        } catch (error) {
            console.error('打开笔记失败:', error);
            alert('打开笔记失败，请重试');
        }
    }

    async saveCurrentNote(silent = false) {
        if (!this.currentNote) return;

        const titleEl = document.getElementById('noteTitle');
        const editorEl = document.getElementById('noteEditor');

        if (!titleEl || !editorEl) return;

        try {
            this.currentNote.title = titleEl.value.trim() || '无标题笔记';
            this.currentNote.content = editorEl.value;
            this.currentNote.updatedAt = new Date().toISOString();

            const savedNote = await window.storageManager.saveNote(this.currentNote);
            
            // 更新当前笔记ID（如果是新笔记）
            if (!this.currentNote.id) {
                this.currentNote.id = savedNote.id;
            }

            // 更新笔记列表
            await this.loadNotes();
            this.updateNotesList();

            if (!silent) {
                this.showNotification('笔记保存成功！', 'success');
            }

            // 清除未保存标记
            this.markAsSaved();

        } catch (error) {
            console.error('保存笔记失败:', error);
            if (!silent) {
                alert('保存笔记失败，请重试');
            }
        }
    }

    async deleteNote(noteId) {
        if (!confirm('确定要删除这个笔记吗？此操作不可撤销。')) {
            return;
        }

        try {
            await window.storageManager.deleteNote(noteId);
            
            // 如果删除的是当前笔记，清空编辑器
            if (this.currentNote && this.currentNote.id === noteId) {
                this.currentNote = null;
                this.updateEditor();
            }

            // 重新加载笔记列表
            await this.loadNotes();
            this.updateNotesList();
            
            this.showNotification('笔记删除成功！', 'success');

        } catch (error) {
            console.error('删除笔记失败:', error);
            alert('删除笔记失败，请重试');
        }
    }

    updateEditor() {
        const titleEl = document.getElementById('noteTitle');
        const editorEl = document.getElementById('noteEditor');
        const previewEl = document.getElementById('notePreview');

        if (!titleEl || !editorEl) return;

        if (this.currentNote) {
            titleEl.value = this.currentNote.title || '';
            editorEl.value = this.currentNote.content || '';
            
            if (this.isPreviewMode && previewEl) {
                this.updatePreview();
            }
        } else {
            titleEl.value = '';
            editorEl.value = '';
            if (previewEl) {
                previewEl.innerHTML = '';
            }
        }

        this.updateWordCount();
    }

    updatePreview() {
        const previewEl = document.getElementById('notePreview');
        if (!previewEl || !this.currentNote) return;

        try {
            // 使用marked.js渲染Markdown
            const html = marked.parse(this.currentNote.content || '');
            previewEl.innerHTML = html;
        } catch (error) {
            console.error('渲染预览失败:', error);
            previewEl.innerHTML = '<p>预览渲染失败</p>';
        }
    }

    togglePreview() {
        const editorEl = document.getElementById('noteEditor');
        const previewEl = document.getElementById('notePreview');
        const toggleBtn = document.getElementById('previewToggle');

        if (!editorEl || !previewEl || !toggleBtn) return;

        this.isPreviewMode = !this.isPreviewMode;

        if (this.isPreviewMode) {
            editorEl.classList.add('hidden');
            previewEl.classList.remove('hidden');
            toggleBtn.textContent = '✏️ 编辑';
            this.updatePreview();
        } else {
            editorEl.classList.remove('hidden');
            previewEl.classList.add('hidden');
            toggleBtn.textContent = '👁️ 预览';
        }
    }

    async analyzeWithAI() {
        if (!this.currentNote || !this.currentNote.content.trim()) {
            alert('请先输入笔记内容');
            return;
        }

        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.remove('hidden');

            // 使用AI分析笔记内容
            const [summary, keywords, knowledgePoints] = await Promise.all([
                window.aiEngine.generateSummary(this.currentNote.content),
                window.aiEngine.extractKeywords(this.currentNote.content),
                window.aiEngine.extractKnowledgePoints(this.currentNote.content)
            ]);

            this.showAnalysisResults({
                summary,
                keywords,
                knowledgePoints
            });

        } catch (error) {
            console.error('AI分析失败:', error);
            alert('AI分析失败，请稍后重试');
        } finally {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.add('hidden');
        }
    }

    showAnalysisResults(results) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = 'AI分析结果';
        
        let html = '<div class="analysis-results">';
        
        // 摘要
        if (results.summary) {
            html += `
                <div class="analysis-section">
                    <h4>📋 内容摘要</h4>
                    <p class="analysis-content">${results.summary}</p>
                </div>
            `;
        }

        // 关键词
        if (results.keywords && results.keywords.length > 0) {
            html += `
                <div class="analysis-section">
                    <h4>🏷️ 关键词</h4>
                    <div class="keywords-list">
                        ${results.keywords.map(kw => 
                            `<span class="keyword-tag">${kw.word} (${kw.frequency})</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // 知识点
        if (results.knowledgePoints && results.knowledgePoints.length > 0) {
            html += `
                <div class="analysis-section">
                    <h4>💡 知识点</h4>
                    <ul class="knowledge-points-list">
                        ${results.knowledgePoints.map(point => 
                            `<li class="knowledge-point ${point.importance}">
                                <span class="point-type">${this.getPointTypeIcon(point.type)}</span>
                                ${point.content}
                            </li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        modalBody.innerHTML = html;

        modalConfirm.textContent = '生成学习任务';
        modalConfirm.onclick = () => {
            this.generateTasksFromAnalysis(results);
            modal.classList.add('hidden');
        };

        modal.classList.remove('hidden');
    }

    getPointTypeIcon(type) {
        const icons = {
            'definition': '📖',
            'step': '📝',
            'concept': '💭',
            'example': '🔍'
        };
        return icons[type] || '•';
    }

    async generateTasksFromAnalysis(results) {
        try {
            const tasks = [];

            // 基于知识点生成复习任务
            if (results.knowledgePoints) {
                for (const point of results.knowledgePoints.slice(0, 3)) {
                    tasks.push({
                        title: `复习：${point.content.substring(0, 30)}...`,
                        description: `复习知识点：${point.content}`,
                        priority: point.importance === 'high' ? 'high' : 'medium',
                        relatedNoteId: this.currentNote.id,
                        type: 'review'
                    });
                }
            }

            // 基于关键词生成练习任务
            if (results.keywords) {
                const topKeywords = results.keywords.slice(0, 2);
                for (const keyword of topKeywords) {
                    tasks.push({
                        title: `练习：${keyword.word}相关概念`,
                        description: `深入理解和练习"${keyword.word}"相关的概念和应用`,
                        priority: 'medium',
                        relatedNoteId: this.currentNote.id,
                        type: 'practice'
                    });
                }
            }

            // 批量创建任务
            for (const taskData of tasks) {
                await window.taskManager.createTask(taskData);
            }

            this.showNotification(`成功生成 ${tasks.length} 个学习任务！`, 'success');

        } catch (error) {
            console.error('生成任务失败:', error);
            alert('生成任务失败，请重试');
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.updateNotesList();
    }

    updateNotesList() {
        const container = document.getElementById('notesList');
        if (!container) return;

        let filteredNotes = this.notes;

        // 应用搜索过滤
        if (this.searchQuery) {
            filteredNotes = this.notes.filter(note =>
                note.title.toLowerCase().includes(this.searchQuery) ||
                note.content.toLowerCase().includes(this.searchQuery)
            );
        }

        if (filteredNotes.length === 0) {
            container.innerHTML = this.getEmptyNotesHTML();
            return;
        }

        container.innerHTML = filteredNotes.map(note => this.getNoteItemHTML(note)).join('');
        
        // 绑定笔记项事件
        this.bindNoteItemEvents();
    }

    getNoteItemHTML(note) {
        const isActive = this.currentNote && this.currentNote.id === note.id;
        const preview = note.content.substring(0, 100).replace(/\n/g, ' ');
        const updatedAt = new Date(note.updatedAt).toLocaleDateString();
        const wordCount = note.content.length;

        return `
            <div class="note-item ${isActive ? 'active' : ''}" data-note-id="${note.id}">
                <div class="note-item-title">${note.title}</div>
                <div class="note-item-preview">${preview}${note.content.length > 100 ? '...' : ''}</div>
                <div class="note-item-meta">
                    <span>${wordCount} 字</span>
                    <span>${updatedAt}</span>
                </div>
                <div class="note-item-actions">
                    <button class="note-action-btn" onclick="noteEditor.deleteNote('${note.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `;
    }

    getEmptyNotesHTML() {
        if (this.searchQuery) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>未找到匹配的笔记</h3>
                    <p>尝试使用其他关键词搜索</p>
                </div>
            `;
        }

        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>还没有笔记</h3>
                <p>点击"新建笔记"开始记录你的学习内容</p>
                <button class="btn-primary" onclick="noteEditor.createNewNote()">
                    + 创建第一个笔记
                </button>
            </div>
        `;
    }

    bindNoteItemEvents() {
        document.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('note-action-btn')) {
                    return; // 忽略操作按钮的点击
                }
                
                const noteId = item.dataset.noteId;
                this.openNote(noteId);
            });
        });
    }

    handleEditorChange() {
        this.updateWordCount();
        this.markAsUnsaved();
        
        // 如果在预览模式，实时更新预览
        if (this.isPreviewMode) {
            this.updatePreview();
        }
    }

    handleTitleChange() {
        this.markAsUnsaved();
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveCurrentNote();
        }
        
        // Ctrl+N 新建笔记
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.createNewNote();
        }
        
        // Ctrl+P 切换预览
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            this.togglePreview();
        }
    }

    handleToolbarAction(action) {
        const editor = document.getElementById('noteEditor');
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        let replacement = '';

        switch (action) {
            case 'bold':
                replacement = `**${selectedText || '粗体文本'}**`;
                break;
            case 'italic':
                replacement = `*${selectedText || '斜体文本'}*`;
                break;
            case 'heading':
                replacement = `## ${selectedText || '标题'}`;
                break;
            case 'list':
                replacement = `- ${selectedText || '列表项'}`;
                break;
            case 'link':
                replacement = `[${selectedText || '链接文本'}](URL)`;
                break;
        }

        if (replacement) {
            editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
            editor.focus();
            
            // 设置光标位置
            const newPos = start + replacement.length;
            editor.setSelectionRange(newPos, newPos);
            
            this.handleEditorChange();
        }
    }

    updateWordCount() {
        const editor = document.getElementById('noteEditor');
        const wordCountEl = document.querySelector('.word-count');
        
        if (editor && wordCountEl) {
            const count = editor.value.length;
            wordCountEl.textContent = `字数: ${count}`;
        }
    }

    hasUnsavedChanges() {
        if (!this.currentNote) return false;
        
        const titleEl = document.getElementById('noteTitle');
        const editorEl = document.getElementById('noteEditor');
        
        if (!titleEl || !editorEl) return false;
        
        const currentTitle = titleEl.value.trim() || '无标题笔记';
        const currentContent = editorEl.value;
        
        return currentTitle !== this.currentNote.title || 
               currentContent !== this.currentNote.content;
    }

    markAsUnsaved() {
        const saveBtn = document.getElementById('saveNoteBtn');
        if (saveBtn) {
            saveBtn.textContent = '💾 保存*';
            saveBtn.classList.add('unsaved');
        }
    }

    markAsSaved() {
        const saveBtn = document.getElementById('saveNoteBtn');
        if (saveBtn) {
            saveBtn.textContent = '💾 保存';
            saveBtn.classList.remove('unsaved');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        if (type === 'success') {
            notification.style.background = '#10b981';
        } else if (type === 'error') {
            notification.style.background = '#ef4444';
        } else {
            notification.style.background = '#6b7280';
        }

        document.body.appendChild(notification);
        
        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 3秒后移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    render() {
        this.updateNotesList();
        this.updateEditor();
    }

    // 获取编辑器统计信息
    getEditorStats() {
        return {
            totalNotes: this.notes.length,
            currentNote: this.currentNote ? this.currentNote.title : null,
            totalWords: this.notes.reduce((sum, note) => sum + note.content.length, 0),
            hasUnsavedChanges: this.hasUnsavedChanges()
        };
    }
}

// 创建全局笔记编辑器实例
window.noteEditor = new NoteEditor();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteEditor;
}