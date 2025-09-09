/**
 * 本地存储管理模块
 * 使用 IndexedDB 存储笔记、任务和知识图谱数据
 */

class StorageManager {
    constructor() {
        this.dbName = 'SmartNotesDB';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            this.db = await this.openDatabase();
            console.log('数据库初始化成功');
        } catch (error) {
            console.error('数据库初始化失败:', error);
            // 降级到 localStorage
            this.useLocalStorage = true;
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建笔记存储
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('title', 'title', { unique: false });
                    notesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // 创建任务存储
                if (!db.objectStoreNames.contains('tasks')) {
                    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    tasksStore.createIndex('priority', 'priority', { unique: false });
                    tasksStore.createIndex('completed', 'completed', { unique: false });
                    tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 创建知识图谱存储
                if (!db.objectStoreNames.contains('knowledge_graph')) {
                    db.createObjectStore('knowledge_graph', { keyPath: 'id' });
                }

                // 创建设置存储
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 通用数据库操作方法
    async performTransaction(storeName, mode, operation) {
        if (this.useLocalStorage) {
            return this.performLocalStorageOperation(storeName, operation);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            const request = operation(store);
            if (request) {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    }

    // localStorage 降级操作
    performLocalStorageOperation(storeName, operation) {
        try {
            const data = JSON.parse(localStorage.getItem(storeName) || '[]');
            const result = operation({ data });
            if (result !== undefined) {
                localStorage.setItem(storeName, JSON.stringify(result));
            }
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    // 笔记相关操作
    async saveNote(note) {
        const noteData = {
            id: note.id || this.generateId(),
            title: note.title || '无标题笔记',
            content: note.content || '',
            tags: note.tags || [],
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: note.content ? note.content.length : 0
        };

        await this.performTransaction('notes', 'readwrite', (store) => {
            return store.put(noteData);
        });

        return noteData;
    }

    async getNotes() {
        return await this.performTransaction('notes', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data || [];
            }
            return store.getAll();
        });
    }

    async getNote(id) {
        return await this.performTransaction('notes', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data.find(note => note.id === id);
            }
            return store.get(id);
        });
    }

    async deleteNote(id) {
        await this.performTransaction('notes', 'readwrite', (store) => {
            if (this.useLocalStorage) {
                const filtered = store.data.filter(note => note.id !== id);
                localStorage.setItem('notes', JSON.stringify(filtered));
                return filtered;
            }
            return store.delete(id);
        });
    }

    async searchNotes(query) {
        const notes = await this.getNotes();
        const searchTerm = query.toLowerCase();
        
        return notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    // 任务相关操作
    async saveTask(task) {
        const taskData = {
            id: task.id || this.generateId(),
            title: task.title || '新任务',
            description: task.description || '',
            priority: task.priority || 'medium',
            completed: task.completed || false,
            dueDate: task.dueDate || null,
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            relatedNoteId: task.relatedNoteId || null
        };

        await this.performTransaction('tasks', 'readwrite', (store) => {
            return store.put(taskData);
        });

        return taskData;
    }

    async getTasks() {
        return await this.performTransaction('tasks', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data || [];
            }
            return store.getAll();
        });
    }

    async getTask(id) {
        return await this.performTransaction('tasks', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data.find(task => task.id === id);
            }
            return store.get(id);
        });
    }

    async deleteTask(id) {
        await this.performTransaction('tasks', 'readwrite', (store) => {
            if (this.useLocalStorage) {
                const filtered = store.data.filter(task => task.id !== id);
                localStorage.setItem('tasks', JSON.stringify(filtered));
                return filtered;
            }
            return store.delete(id);
        });
    }

    async updateTaskStatus(id, completed) {
        const task = await this.getTask(id);
        if (task) {
            task.completed = completed;
            task.updatedAt = new Date().toISOString();
            await this.saveTask(task);
        }
        return task;
    }

    // 知识图谱相关操作
    async saveKnowledgeGraph(graphData) {
        const data = {
            id: 'main_graph',
            nodes: graphData.nodes || [],
            links: graphData.links || [],
            updatedAt: new Date().toISOString()
        };

        await this.performTransaction('knowledge_graph', 'readwrite', (store) => {
            return store.put(data);
        });

        return data;
    }

    async getKnowledgeGraph() {
        return await this.performTransaction('knowledge_graph', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data.find(item => item.id === 'main_graph') || { nodes: [], links: [] };
            }
            return store.get('main_graph');
        });
    }

    // 设置相关操作
    async saveSetting(key, value) {
        const setting = {
            key: key,
            value: value,
            updatedAt: new Date().toISOString()
        };

        await this.performTransaction('settings', 'readwrite', (store) => {
            return store.put(setting);
        });

        return setting;
    }

    async getSetting(key, defaultValue = null) {
        const setting = await this.performTransaction('settings', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data.find(item => item.key === key);
            }
            return store.get(key);
        });

        return setting ? setting.value : defaultValue;
    }

    // 数据导出
    async exportData() {
        const [notes, tasks, knowledgeGraph, settings] = await Promise.all([
            this.getNotes(),
            this.getTasks(),
            this.getKnowledgeGraph(),
            this.getAllSettings()
        ]);

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                notes,
                tasks,
                knowledgeGraph,
                settings
            }
        };
    }

    async getAllSettings() {
        return await this.performTransaction('settings', 'readonly', (store) => {
            if (this.useLocalStorage) {
                return store.data || [];
            }
            return store.getAll();
        });
    }

    // 数据导入
    async importData(importData) {
        try {
            if (!importData.data) {
                throw new Error('无效的导入数据格式');
            }

            const { notes, tasks, knowledgeGraph, settings } = importData.data;

            // 清空现有数据（可选）
            // await this.clearAllData();

            // 导入笔记
            if (notes && Array.isArray(notes)) {
                for (const note of notes) {
                    await this.saveNote(note);
                }
            }

            // 导入任务
            if (tasks && Array.isArray(tasks)) {
                for (const task of tasks) {
                    await this.saveTask(task);
                }
            }

            // 导入知识图谱
            if (knowledgeGraph) {
                await this.saveKnowledgeGraph(knowledgeGraph);
            }

            // 导入设置
            if (settings && Array.isArray(settings)) {
                for (const setting of settings) {
                    await this.saveSetting(setting.key, setting.value);
                }
            }

            return true;
        } catch (error) {
            console.error('数据导入失败:', error);
            throw error;
        }
    }

    // 清空所有数据
    async clearAllData() {
        const stores = ['notes', 'tasks', 'knowledge_graph', 'settings'];
        
        for (const storeName of stores) {
            await this.performTransaction(storeName, 'readwrite', (store) => {
                if (this.useLocalStorage) {
                    localStorage.removeItem(storeName);
                    return [];
                }
                return store.clear();
            });
        }
    }

    // 获取存储统计信息
    async getStorageStats() {
        const [notes, tasks] = await Promise.all([
            this.getNotes(),
            this.getTasks()
        ]);

        const totalNotes = notes.length;
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0);

        return {
            totalNotes,
            totalTasks,
            completedTasks,
            totalWords,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    }
}

// 创建全局存储管理器实例
window.storageManager = new StorageManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}