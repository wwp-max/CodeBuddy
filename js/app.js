/**
 * 主应用模块
 * 协调各个模块，处理全局事件和状态管理
 */

class SmartNotesApp {
    constructor() {
        this.currentTab = 'notes';
        this.knowledgeGraph = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('智慧学习笔记应用初始化中...');
            
            // 等待所有模块初始化完成
            await this.waitForModules();
            
            // 初始化UI
            this.initializeUI();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            // 初始化知识图谱
            this.initializeKnowledgeGraph();
            
            // 检查PWA安装状态
            this.checkPWAInstallation();
            
            this.isInitialized = true;
            console.log('应用初始化完成');
            
            // 显示欢迎消息
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage('应用初始化失败，请刷新页面重试');
        }
    }

    async waitForModules() {
        // 等待所有必要的模块加载完成
        const maxWaitTime = 10000; // 10秒超时
        const startTime = Date.now();
        
        while (!window.storageManager || !window.aiEngine || !window.noteEditor || !window.taskManager) {
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error('模块加载超时');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 等待存储管理器初始化
        while (!window.storageManager.db && !window.storageManager.useLocalStorage) {
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('存储管理器初始化超时，使用localStorage降级');
                window.storageManager.useLocalStorage = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 等待AI引擎初始化
        while (!window.aiEngine.isInitialized) {
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('AI引擎初始化超时');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    initializeUI() {
        // 设置默认标签页
        this.switchTab('notes');
        
        // 初始化模态框
        this.initializeModal();
        
        // 设置主题
        this.applyTheme();
        
        // 更新状态显示
        this.updateStatusBar();
    }

    bindGlobalEvents() {
        // 标签页切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 导入导出功能
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.importData();
        });

        // API配置功能
        document.getElementById('api-config-btn')?.addEventListener('click', () => {
            if (window.apiConfigManager) {
                window.apiConfigManager.showModal();
            }
        });



        // 文件输入处理
        document.getElementById('fileInput')?.addEventListener('change', (e) => {
            this.handleFileImport(e);
        });

        // 模态框事件
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modalCancel')?.addEventListener('click', () => {
            this.closeModal();
        });

        // 点击模态框背景关闭
        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboardShortcuts(e);
        });

        // 自定义事件监听
        document.addEventListener('switchTab', (e) => {
            this.switchTab(e.detail.tab);
        });

        document.addEventListener('nodeClick', (e) => {
            this.handleGraphNodeClick(e.detail);
        });

        // AI配置事件监听
        window.addEventListener('aiConfigUpdated', (e) => {
            this.onAIConfigUpdated(e.detail);
        });

        window.addEventListener('aiConfigCleared', () => {
            this.onAIConfigCleared();
        });



        // 窗口事件
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
            }
        });

        // PWA安装事件
        window.addEventListener('beforeinstallprompt', (e) => {
            this.handlePWAInstallPrompt(e);
        });
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;
        
        // 更新导航标签
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // 更新面板显示
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-panel`)?.classList.add('active');
        
        this.currentTab = tabName;
        
        // 特殊处理
        if (tabName === 'graph') {
            this.refreshKnowledgeGraph();
        }
        
        // 更新URL（可选）
        if (history.pushState) {
            history.pushState(null, null, `#${tabName}`);
        }
    }

    initializeKnowledgeGraph() {
        try {
            this.knowledgeGraph = new KnowledgeGraph('knowledgeGraph');
            
            // 绑定图谱控制事件
            document.getElementById('refreshGraphBtn')?.addEventListener('click', () => {
                this.refreshKnowledgeGraph();
            });
            
            document.getElementById('exportGraphBtn')?.addEventListener('click', () => {
                this.knowledgeGraph?.exportImage();
            });
            
            document.getElementById('graphZoom')?.addEventListener('input', (e) => {
                this.knowledgeGraph?.setZoom(parseFloat(e.target.value));
            });
            
            document.getElementById('graphLayout')?.addEventListener('change', (e) => {
                this.knowledgeGraph?.setLayout(e.target.value);
            });
            
        } catch (error) {
            console.error('知识图谱初始化失败:', error);
        }
    }

    async refreshKnowledgeGraph() {
        if (!this.knowledgeGraph) return;
        
        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.remove('hidden');
            
            await this.knowledgeGraph.refresh();
            
        } catch (error) {
            console.error('刷新知识图谱失败:', error);
            this.showErrorMessage('刷新知识图谱失败');
        } finally {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.add('hidden');
        }
    }

    handleGraphNodeClick(detail) {
        const { node } = detail;
        
        if (node.type === 'note' && node.data) {
            // 切换到笔记编辑页面并打开对应笔记
            this.switchTab('notes');
            setTimeout(() => {
                window.noteEditor?.openNote(node.data.id);
            }, 100);
        }
    }

    async exportData() {
        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.remove('hidden');
            
            const exportData = await window.storageManager.exportData();
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `smart-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            this.showSuccessMessage('数据导出成功！');
            
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showErrorMessage('导出数据失败');
        } finally {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.add('hidden');
        }
    }

    importData() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.remove('hidden');
            
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!confirm('导入数据将覆盖现有数据，确定要继续吗？')) {
                return;
            }
            
            await window.storageManager.importData(importData);
            
            // 重新加载所有模块数据
            await this.reloadAllModules();
            
            this.showSuccessMessage('数据导入成功！');
            
        } catch (error) {
            console.error('导入数据失败:', error);
            this.showErrorMessage('导入数据失败，请检查文件格式');
        } finally {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.add('hidden');
            
            // 清空文件输入
            event.target.value = '';
        }
    }

    async reloadAllModules() {
        try {
            // 重新加载笔记编辑器
            await window.noteEditor?.loadNotes();
            window.noteEditor?.render();
            
            // 重新加载任务管理器
            await window.taskManager?.loadTasks();
            window.taskManager?.render();
            
            // 刷新知识图谱
            await this.refreshKnowledgeGraph();
            
        } catch (error) {
            console.error('重新加载模块失败:', error);
        }
    }

    handleGlobalKeyboardShortcuts(e) {
        // Alt + 数字键切换标签页
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const tabs = ['notes', 'graph', 'tasks', 'ai'];
            const keyNum = parseInt(e.key);
            
            if (keyNum >= 1 && keyNum <= tabs.length) {
                e.preventDefault();
                this.switchTab(tabs[keyNum - 1]);
            }
        }
        
        // Ctrl + Alt + E 导出数据
        if (e.ctrlKey && e.altKey && e.key === 'e') {
            e.preventDefault();
            this.exportData();
        }
        
        // Ctrl + Alt + I 导入数据
        if (e.ctrlKey && e.altKey && e.key === 'i') {
            e.preventDefault();
            this.importData();
        }
        
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    initializeModal() {
        // 模态框初始化逻辑
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal?.classList.add('hidden');
    }

    applyTheme() {
        // 应用主题设置
        const savedTheme = localStorage.getItem('smart-notes-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    async updateStatusBar() {
        try {
            const stats = await window.storageManager.getStorageStats();
            
            // 更新状态信息（如果有状态栏的话）
            console.log('应用统计:', stats);
            
        } catch (error) {
            console.error('更新状态栏失败:', error);
        }
    }

    hasUnsavedChanges() {
        return window.noteEditor?.hasUnsavedChanges() || false;
    }

    checkPWAInstallation() {
        // 检查是否已安装PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('应用运行在PWA模式');
        }
    }

    handlePWAInstallPrompt(e) {
        // 阻止默认的安装提示
        e.preventDefault();
        
        // 保存事件以便后续使用
        this.deferredPrompt = e;
        
        // 显示自定义安装按钮（如果需要）
        this.showPWAInstallButton();
    }

    showPWAInstallButton() {
        // 显示PWA安装提示
        const installButton = document.createElement('button');
        installButton.textContent = '📱 安装应用';
        installButton.className = 'btn-primary pwa-install-btn';
        installButton.style.position = 'fixed';
        installButton.style.bottom = '20px';
        installButton.style.right = '20px';
        installButton.style.zIndex = '1000';
        
        installButton.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('用户接受了PWA安装');
                } else {
                    console.log('用户拒绝了PWA安装');
                }
                
                this.deferredPrompt = null;
                installButton.remove();
            }
        });
        
        document.body.appendChild(installButton);
        
        // 10秒后自动隐藏
        setTimeout(() => {
            installButton.remove();
        }, 10000);
    }

    showWelcomeMessage() {
        // 检查是否是首次访问
        const isFirstVisit = !localStorage.getItem('smart-notes-visited');
        
        if (isFirstVisit) {
            localStorage.setItem('smart-notes-visited', 'true');
            
            setTimeout(() => {
                this.showInfoMessage('欢迎使用智慧学习笔记！开始创建你的第一个笔记吧。', 5000);
            }, 1000);
        }
    }

    showSuccessMessage(message, duration = 3000) {
        this.showMessage(message, 'success', duration);
    }

    showErrorMessage(message, duration = 5000) {
        this.showMessage(message, 'error', duration);
    }

    showInfoMessage(message, duration = 3000) {
        this.showMessage(message, 'info', duration);
    }

    showMessage(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `app-notification notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        });

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }

    // 获取应用状态
    getAppStatus() {
        return {
            initialized: this.isInitialized,
            currentTab: this.currentTab,
            modules: {
                storage: !!window.storageManager,
                ai: !!window.aiEngine,
                noteEditor: !!window.noteEditor,
                taskManager: !!window.taskManager,
                knowledgeGraph: !!this.knowledgeGraph
            },
            hasUnsavedChanges: this.hasUnsavedChanges()
        };
    }





    // AI配置更新处理
    onAIConfigUpdated(config) {
        console.log('AI配置已更新:', config);
        
        // 更新UI状态
        this.updateAIStatus();
        
        // 显示成功消息
        this.showSuccessMessage(`✅ AI配置已更新，现在使用 ${config.providerName} 提供的AI服务`);
        
        // 如果当前在AI助手标签页，刷新界面
        if (this.currentTab === 'ai') {
            this.refreshAIPanel();
        }
    }

    // AI配置清除处理
    onAIConfigCleared() {
        console.log('AI配置已清除');
        
        // 更新UI状态
        this.updateAIStatus();
        
        // 显示信息消息
        this.showInfoMessage('🔄 已切换到本地模拟模式');
        
        // 如果当前在AI助手标签页，刷新界面
        if (this.currentTab === 'ai') {
            this.refreshAIPanel();
        }
    }

    // 更新AI状态显示
    updateAIStatus() {
        const aiConfigBtn = document.getElementById('api-config-btn');
        if (aiConfigBtn && window.apiConfigManager) {
            const status = window.apiConfigManager.getConfigStatus();
            
            if (status.configured) {
                aiConfigBtn.textContent = `🤖 AI配置 (${status.provider})`;
                aiConfigBtn.classList.remove('btn-secondary');
                aiConfigBtn.classList.add('btn-primary');
                aiConfigBtn.title = `当前使用 ${status.provider} - ${status.model}`;
            } else {
                aiConfigBtn.textContent = '🤖 AI配置';
                aiConfigBtn.classList.remove('btn-primary');
                aiConfigBtn.classList.add('btn-secondary');
                aiConfigBtn.title = '点击配置AI服务以获得更好的体验';
            }
        }
    }

    // 刷新AI面板
    refreshAIPanel() {
        // 这里可以添加刷新AI助手界面的逻辑
        const aiPanel = document.getElementById('ai-panel');
        if (aiPanel) {
            // 触发AI面板刷新事件
            aiPanel.dispatchEvent(new CustomEvent('refresh'));
        }
    }

    // 应用清理
    destroy() {
        if (this.knowledgeGraph) {
            this.knowledgeGraph.destroy();
        }
        
        // 清理事件监听器
        document.removeEventListener('keydown', this.handleGlobalKeyboardShortcuts);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        console.log('应用已清理');
    }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.smartNotesApp = new SmartNotesApp();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartNotesApp;
}