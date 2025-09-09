/**
 * 任务管理模块
 * 处理学习任务的创建、更新、删除和状态管理
 */

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
        this.init();
    }

    async init() {
        await this.loadTasks();
        this.bindEvents();
        this.render();
    }

    async loadTasks() {
        try {
            this.tasks = await window.storageManager.getTasks();
            this.updateStats();
        } catch (error) {
            console.error('加载任务失败:', error);
            this.tasks = [];
        }
    }

    bindEvents() {
        // 添加任务按钮
        document.getElementById('addTaskBtn')?.addEventListener('click', () => {
            this.showAddTaskModal();
        });

        // AI生成任务按钮
        document.getElementById('generateTasksBtn')?.addEventListener('click', () => {
            this.generateTasksFromNotes();
        });

        // 监听任务相关的自定义事件
        document.addEventListener('taskStatusChanged', (event) => {
            this.handleTaskStatusChange(event.detail);
        });

        document.addEventListener('taskDeleted', (event) => {
            this.handleTaskDeletion(event.detail);
        });
    }

    async createTask(taskData) {
        try {
            const task = await window.storageManager.saveTask(taskData);
            this.tasks.push(task);
            this.updateStats();
            this.render();
            return task;
        } catch (error) {
            console.error('创建任务失败:', error);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const taskIndex = this.tasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) {
                throw new Error('任务不存在');
            }

            const updatedTask = { ...this.tasks[taskIndex], ...updates, updatedAt: new Date().toISOString() };
            await window.storageManager.saveTask(updatedTask);
            
            this.tasks[taskIndex] = updatedTask;
            this.updateStats();
            this.render();
            
            return updatedTask;
        } catch (error) {
            console.error('更新任务失败:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            await window.storageManager.deleteTask(taskId);
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.updateStats();
            this.render();
        } catch (error) {
            console.error('删除任务失败:', error);
            throw error;
        }
    }

    async toggleTaskStatus(taskId) {
        try {
            const task = this.tasks.find(task => task.id === taskId);
            if (!task) {
                throw new Error('任务不存在');
            }

            const newStatus = !task.completed;
            await this.updateTask(taskId, { completed: newStatus });
            
            // 触发状态变更事件
            const event = new CustomEvent('taskStatusChanged', {
                detail: { taskId, completed: newStatus, task }
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('切换任务状态失败:', error);
        }
    }

    handleTaskStatusChange(detail) {
        const { taskId, completed } = detail;
        console.log(`任务 ${taskId} 状态变更为: ${completed ? '已完成' : '未完成'}`);
        
        // 可以在这里添加额外的逻辑，如发送通知、更新统计等
        if (completed) {
            this.showTaskCompletionFeedback(detail.task);
        }
    }

    handleTaskDeletion(detail) {
        const { taskId } = detail;
        console.log(`任务 ${taskId} 已删除`);
    }

    showTaskCompletionFeedback(task) {
        // 显示任务完成的反馈
        const notification = document.createElement('div');
        notification.className = 'task-completion-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-text">任务"${task.title}"已完成！</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async generateTasksFromNotes() {
        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.remove('hidden');

            const notes = await window.storageManager.getNotes();
            if (notes.length === 0) {
                alert('请先创建一些笔记，然后再生成学习任务。');
                return;
            }

            const generatedTasks = [];

            for (const note of notes.slice(0, 5)) { // 限制处理前5个笔记
                try {
                    // 使用AI生成练习题
                    const questions = await window.aiEngine.generateQuestions(note.content, 3);
                    
                    for (const question of questions) {
                        const task = {
                            title: `练习：${question.question}`,
                            description: `基于笔记"${note.title}"生成的练习题`,
                            priority: question.difficulty === 'hard' ? 'high' : 'medium',
                            completed: false,
                            relatedNoteId: note.id,
                            type: 'practice',
                            aiGenerated: true,
                            questionData: question
                        };
                        
                        generatedTasks.push(task);
                    }

                    // 生成复习任务
                    const reviewTask = {
                        title: `复习：${note.title}`,
                        description: '复习和巩固笔记内容',
                        priority: 'medium',
                        completed: false,
                        relatedNoteId: note.id,
                        type: 'review',
                        aiGenerated: true
                    };
                    
                    generatedTasks.push(reviewTask);

                } catch (error) {
                    console.warn(`为笔记 ${note.title} 生成任务时出错:`, error);
                }
            }

            // 批量创建任务
            for (const taskData of generatedTasks) {
                await this.createTask(taskData);
            }

            alert(`成功生成 ${generatedTasks.length} 个学习任务！`);

        } catch (error) {
            console.error('生成任务失败:', error);
            alert('生成任务失败，请稍后重试。');
        } finally {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator?.classList.add('hidden');
        }
    }

    showAddTaskModal() {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = '添加新任务';
        modalBody.innerHTML = `
            <form id="addTaskForm">
                <div class="form-group">
                    <label for="taskTitle">任务标题 *</label>
                    <input type="text" id="taskTitle" required placeholder="输入任务标题">
                </div>
                <div class="form-group">
                    <label for="taskDescription">任务描述</label>
                    <textarea id="taskDescription" rows="3" placeholder="描述任务详情（可选）"></textarea>
                </div>
                <div class="form-group">
                    <label for="taskPriority">优先级</label>
                    <select id="taskPriority">
                        <option value="low">低</option>
                        <option value="medium" selected>中</option>
                        <option value="high">高</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="taskDueDate">截止日期</label>
                    <input type="date" id="taskDueDate">
                </div>
                <div class="form-group">
                    <label for="relatedNote">关联笔记</label>
                    <select id="relatedNote">
                        <option value="">无关联笔记</option>
                    </select>
                </div>
            </form>
        `;

        // 填充关联笔记选项
        this.populateNoteOptions();

        modalConfirm.textContent = '创建任务';
        modalConfirm.onclick = () => this.handleAddTaskSubmit();

        modal.classList.remove('hidden');
    }

    async populateNoteOptions() {
        try {
            const notes = await window.storageManager.getNotes();
            const select = document.getElementById('relatedNote');
            
            notes.forEach(note => {
                const option = document.createElement('option');
                option.value = note.id;
                option.textContent = note.title;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('加载笔记列表失败:', error);
        }
    }

    async handleAddTaskSubmit() {
        const form = document.getElementById('addTaskForm');
        const formData = new FormData(form);
        
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value || null,
            relatedNoteId: document.getElementById('relatedNote').value || null,
            type: 'manual'
        };

        if (!taskData.title) {
            alert('请输入任务标题');
            return;
        }

        try {
            await this.createTask(taskData);
            document.getElementById('modal').classList.add('hidden');
            
            // 显示成功消息
            this.showNotification('任务创建成功！', 'success');
        } catch (error) {
            alert('创建任务失败，请重试');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // 更新统计显示
        const totalTasksEl = document.getElementById('totalTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const progressPercentEl = document.getElementById('progressPercent');

        if (totalTasksEl) totalTasksEl.textContent = totalTasks;
        if (completedTasksEl) completedTasksEl.textContent = completedTasks;
        if (progressPercentEl) progressPercentEl.textContent = `${progressPercent}%`;
    }

    render() {
        const container = document.getElementById('tasksList');
        if (!container) return;

        const filteredTasks = this.getFilteredTasks();
        const sortedTasks = this.getSortedTasks(filteredTasks);

        if (sortedTasks.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = sortedTasks.map(task => this.getTaskHTML(task)).join('');
        
        // 绑定任务项事件
        this.bindTaskEvents();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            case 'high':
                return this.tasks.filter(task => task.priority === 'high');
            default:
                return this.tasks;
        }
    }

    getSortedTasks(tasks) {
        return tasks.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];
            
            if (this.sortBy === 'createdAt' || this.sortBy === 'updatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (this.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }

    getTaskHTML(task) {
        const priorityClass = `task-priority ${task.priority}`;
        const completedClass = task.completed ? 'completed' : '';
        const checkboxClass = task.completed ? 'task-checkbox completed' : 'task-checkbox';
        const dueDateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        const aiGeneratedBadge = task.aiGenerated ? '<span class="ai-badge">🤖 AI生成</span>' : '';

        return `
            <div class="task-item ${completedClass}" data-task-id="${task.id}">
                <div class="${checkboxClass}" onclick="taskManager.toggleTaskStatus('${task.id}')">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    ${aiGeneratedBadge}
                </div>
                <div class="task-meta">
                    <div class="${priorityClass}">${this.getPriorityText(task.priority)}</div>
                    ${dueDateText ? `<div class="task-due-date">📅 ${dueDateText}</div>` : ''}
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="taskManager.editTask('${task.id}')" title="编辑">✏️</button>
                        <button class="task-action-btn" onclick="taskManager.deleteTask('${task.id}')" title="删除">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'high': '高优先级',
            'medium': '中优先级',
            'low': '低优先级'
        };
        return priorityMap[priority] || priority;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>暂无学习任务</h3>
                <p>点击"添加任务"创建新的学习任务，或使用AI自动生成任务。</p>
                <button class="btn-primary" onclick="taskManager.showAddTaskModal()">
                    + 添加第一个任务
                </button>
            </div>
        `;
    }

    bindTaskEvents() {
        // 任务项点击事件已在HTML中通过onclick绑定
        // 这里可以添加其他需要的事件绑定
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 显示编辑任务的模态框
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = '编辑任务';
        modalBody.innerHTML = `
            <form id="editTaskForm">
                <div class="form-group">
                    <label for="editTaskTitle">任务标题 *</label>
                    <input type="text" id="editTaskTitle" required value="${task.title}">
                </div>
                <div class="form-group">
                    <label for="editTaskDescription">任务描述</label>
                    <textarea id="editTaskDescription" rows="3">${task.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editTaskPriority">优先级</label>
                    <select id="editTaskPriority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>中</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editTaskDueDate">截止日期</label>
                    <input type="date" id="editTaskDueDate" value="${task.dueDate || ''}">
                </div>
            </form>
        `;

        modalConfirm.textContent = '保存更改';
        modalConfirm.onclick = () => this.handleEditTaskSubmit(taskId);

        modal.classList.remove('hidden');
    }

    async handleEditTaskSubmit(taskId) {
        const updates = {
            title: document.getElementById('editTaskTitle').value.trim(),
            description: document.getElementById('editTaskDescription').value.trim(),
            priority: document.getElementById('editTaskPriority').value,
            dueDate: document.getElementById('editTaskDueDate').value || null
        };

        if (!updates.title) {
            alert('请输入任务标题');
            return;
        }

        try {
            await this.updateTask(taskId, updates);
            document.getElementById('modal').classList.add('hidden');
            this.showNotification('任务更新成功！', 'success');
        } catch (error) {
            alert('更新任务失败，请重试');
        }
    }

    // 设置过滤器
    setFilter(filter) {
        this.currentFilter = filter;
        this.render();
    }

    // 设置排序
    setSorting(sortBy, sortOrder = 'desc') {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.render();
    }

    // 获取任务统计
    getTaskStats() {
        const stats = {
            total: this.tasks.length,
            completed: this.tasks.filter(t => t.completed).length,
            pending: this.tasks.filter(t => !t.completed).length,
            high: this.tasks.filter(t => t.priority === 'high').length,
            medium: this.tasks.filter(t => t.priority === 'medium').length,
            low: this.tasks.filter(t => t.priority === 'low').length,
            overdue: this.tasks.filter(t => {
                return t.dueDate && new Date(t.dueDate) < new Date() && !t.completed;
            }).length
        };

        stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        
        return stats;
    }
}

// 创建全局任务管理器实例
window.taskManager = new TaskManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}