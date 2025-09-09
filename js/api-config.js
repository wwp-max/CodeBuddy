/**
 * API配置管理模块
 * 提供大模型API配置界面和管理功能
 */

class APIConfigManager {
    constructor() {
        this.modal = null;
        this.currentConfig = {};
        this.init();
    }

    init() {
        this.createConfigModal();
        this.bindEvents();
    }

    // 创建配置模态框
    createConfigModal() {
        const modalHTML = `
            <div id="api-config-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🤖 AI API 配置</h3>
                        <span class="close" id="close-api-config">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="config-section">
                            <label for="api-provider">选择AI服务提供商：</label>
                            <select id="api-provider" class="form-control">
                                <option value="">请选择...</option>
                                <option value="openai">OpenAI (GPT-3.5/GPT-4)</option>
                                <option value="claude">Anthropic Claude</option>
                                <option value="qwen">阿里云通义千问</option>
                                <option value="ernie">百度文心一言</option>
                                <option value="gemini">Google Gemini</option>
                            </select>
                        </div>

                        <div class="config-section">
                            <label for="api-key">API密钥：</label>
                            <input type="password" id="api-key" class="form-control" placeholder="请输入您的API密钥">
                            <small class="help-text">API密钥将安全存储在本地浏览器中</small>
                        </div>

                        <div class="config-section" id="api-secret-section" style="display: none;">
                            <label for="api-secret">API Secret（文心一言需要）：</label>
                            <input type="password" id="api-secret" class="form-control" placeholder="请输入API Secret">
                        </div>

                        <div class="config-section">
                            <label for="api-model">选择模型：</label>
                            <select id="api-model" class="form-control">
                                <option value="">请先选择服务提供商</option>
                            </select>
                        </div>

                        <div class="config-section">
                            <label for="api-base-url">API基础URL（可选）：</label>
                            <input type="url" id="api-base-url" class="form-control" placeholder="留空使用默认URL">
                            <small class="help-text">如使用代理或私有部署，请填写自定义URL</small>
                        </div>

                        <div class="config-section">
                            <div class="config-status" id="config-status">
                                <span class="status-indicator" id="status-indicator">⚪</span>
                                <span id="status-text">未配置</span>
                            </div>
                        </div>

                        <div class="config-section">
                            <h4>📋 配置说明</h4>
                            <div class="provider-info" id="provider-info">
                                <p>请选择一个AI服务提供商以查看配置说明。</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="test-api-btn" class="btn btn-secondary" disabled>🧪 测试连接</button>
                        <button id="save-api-config" class="btn btn-primary" disabled>💾 保存配置</button>
                        <button id="clear-api-config" class="btn btn-danger">🗑️ 清除配置</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('api-config-modal');
    }

    // 绑定事件
    bindEvents() {
        // 关闭模态框
        document.getElementById('close-api-config').addEventListener('click', () => {
            this.hideModal();
        });

        // 点击模态框外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // 提供商选择变化
        document.getElementById('api-provider').addEventListener('change', (e) => {
            this.onProviderChange(e.target.value);
        });

        // API密钥输入
        document.getElementById('api-key').addEventListener('input', () => {
            this.validateConfig();
        });

        // 保存配置
        document.getElementById('save-api-config').addEventListener('click', () => {
            this.saveConfig();
        });

        // 清除配置
        document.getElementById('clear-api-config').addEventListener('click', () => {
            this.clearConfig();
        });

        // 测试API连接
        document.getElementById('test-api-btn').addEventListener('click', () => {
            this.testConnection();
        });
    }

    // 显示配置模态框
    showModal() {
        this.loadCurrentConfig();
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 隐藏配置模态框
    hideModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // 加载当前配置
    loadCurrentConfig() {
        if (window.aiEngine) {
            this.currentConfig = { ...window.aiEngine.apiConfig };
            
            // 填充表单
            document.getElementById('api-provider').value = this.currentConfig.provider || '';
            document.getElementById('api-key').value = this.currentConfig.apiKey || '';
            document.getElementById('api-secret').value = this.currentConfig.apiSecret || '';
            document.getElementById('api-base-url').value = this.currentConfig.baseURL || '';
            
            if (this.currentConfig.provider) {
                this.onProviderChange(this.currentConfig.provider);
                document.getElementById('api-model').value = this.currentConfig.model || '';
            }

            this.updateStatus();
        }
    }

    // 提供商变化处理
    onProviderChange(provider) {
        const modelSelect = document.getElementById('api-model');
        const secretSection = document.getElementById('api-secret-section');
        const baseUrlInput = document.getElementById('api-base-url');
        const providerInfo = document.getElementById('provider-info');

        // 清空模型选择
        modelSelect.innerHTML = '<option value="">请选择模型...</option>';

        if (!provider) {
            secretSection.style.display = 'none';
            baseUrlInput.value = '';
            providerInfo.innerHTML = '<p>请选择一个AI服务提供商以查看配置说明。</p>';
            return;
        }

        const providers = window.aiEngine?.getSupportedProviders() || {};
        const providerConfig = providers[provider];

        if (providerConfig) {
            // 填充模型选项
            providerConfig.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });

            // 设置默认基础URL
            if (!baseUrlInput.value) {
                baseUrlInput.value = providerConfig.baseURL;
            }

            // 显示/隐藏Secret字段（文心一言需要）
            secretSection.style.display = provider === 'ernie' ? 'block' : 'none';

            // 更新配置说明
            this.updateProviderInfo(provider, providerConfig);
        }

        this.validateConfig();
    }

    // 更新提供商信息
    updateProviderInfo(provider, config) {
        const providerInfo = document.getElementById('provider-info');
        
        const infoMap = {
            openai: {
                title: 'OpenAI API 配置',
                steps: [
                    '1. 访问 <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a>',
                    '2. 创建新的API密钥',
                    '3. 复制密钥并粘贴到上方输入框',
                    '4. 选择合适的模型（推荐 gpt-3.5-turbo）'
                ],
                note: '注意：需要有效的OpenAI账户和充值余额'
            },
            claude: {
                title: 'Anthropic Claude API 配置',
                steps: [
                    '1. 访问 <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a>',
                    '2. 获取API密钥',
                    '3. 复制密钥并粘贴到上方输入框',
                    '4. 选择合适的Claude模型'
                ],
                note: '注意：需要Anthropic账户和API访问权限'
            },
            qwen: {
                title: '通义千问 API 配置',
                steps: [
                    '1. 访问 <a href="https://dashscope.aliyun.com/" target="_blank">阿里云DashScope</a>',
                    '2. 创建API-KEY',
                    '3. 复制密钥并粘贴到上方输入框',
                    '4. 选择合适的通义千问模型'
                ],
                note: '注意：需要阿里云账户和开通DashScope服务'
            },
            ernie: {
                title: '文心一言 API 配置',
                steps: [
                    '1. 访问 <a href="https://console.bce.baidu.com/qianfan/" target="_blank">百度千帆大模型平台</a>',
                    '2. 创建应用获取API Key和Secret Key',
                    '3. 分别填入API密钥和API Secret',
                    '4. 选择合适的文心一言模型'
                ],
                note: '注意：需要百度账户和开通千帆服务'
            },
            gemini: {
                title: 'Google Gemini API 配置',
                steps: [
                    '1. 访问 <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
                    '2. 创建API密钥',
                    '3. 复制密钥并粘贴到上方输入框',
                    '4. 选择合适的Gemini模型'
                ],
                note: '注意：需要Google账户和API访问权限'
            }
        };

        const info = infoMap[provider];
        if (info) {
            providerInfo.innerHTML = `
                <h5>${info.title}</h5>
                <ol>
                    ${info.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
                <p class="note"><strong>📝 ${info.note}</strong></p>
            `;
        }
    }

    // 验证配置
    validateConfig() {
        const provider = document.getElementById('api-provider').value;
        const apiKey = document.getElementById('api-key').value.trim();
        const saveBtn = document.getElementById('save-api-config');
        const testBtn = document.getElementById('test-api-btn');

        const isValid = provider && apiKey;
        
        saveBtn.disabled = !isValid;
        testBtn.disabled = !isValid;

        if (isValid) {
            saveBtn.classList.remove('btn-secondary');
            saveBtn.classList.add('btn-primary');
        } else {
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-secondary');
        }
    }

    // 保存配置
    saveConfig() {
        const config = {
            provider: document.getElementById('api-provider').value,
            apiKey: document.getElementById('api-key').value.trim(),
            apiSecret: document.getElementById('api-secret').value.trim(),
            model: document.getElementById('api-model').value,
            baseURL: document.getElementById('api-base-url').value.trim()
        };

        if (!config.provider || !config.apiKey) {
            alert('请填写必要的配置信息');
            return;
        }

        // 使用默认模型如果未选择
        if (!config.model && window.aiEngine) {
            const providers = window.aiEngine.getSupportedProviders();
            const providerConfig = providers[config.provider];
            if (providerConfig && providerConfig.models.length > 0) {
                config.model = providerConfig.models[0];
            }
        }

        // 使用默认URL如果未填写
        if (!config.baseURL && window.aiEngine) {
            const providers = window.aiEngine.getSupportedProviders();
            const providerConfig = providers[config.provider];
            if (providerConfig) {
                config.baseURL = providerConfig.baseURL;
            }
        }

        try {
            // 配置AI引擎
            if (window.aiEngine) {
                window.aiEngine.configureAPI(config);
            }

            this.currentConfig = config;
            this.updateStatus();
            
            // 显示成功消息
            this.showMessage('✅ API配置已保存！', 'success');
            
            // 通知其他组件配置已更新
            window.dispatchEvent(new CustomEvent('aiConfigUpdated', { detail: config }));
            
        } catch (error) {
            console.error('保存API配置失败:', error);
            this.showMessage('❌ 保存配置失败: ' + error.message, 'error');
        }
    }

    // 清除配置
    clearConfig() {
        if (confirm('确定要清除所有API配置吗？这将切换回本地模拟模式。')) {
            // 清空表单
            document.getElementById('api-provider').value = '';
            document.getElementById('api-key').value = '';
            document.getElementById('api-secret').value = '';
            document.getElementById('api-model').value = '';
            document.getElementById('api-base-url').value = '';

            // 清除AI引擎配置
            if (window.aiEngine) {
                window.aiEngine.configureAPI({ apiKey: '' });
            }

            this.currentConfig = {};
            this.updateStatus();
            this.onProviderChange('');
            
            this.showMessage('🗑️ API配置已清除，已切换到本地模拟模式', 'info');
            
            // 通知其他组件配置已清除
            window.dispatchEvent(new CustomEvent('aiConfigCleared'));
        }
    }

    // 测试API连接
    async testConnection() {
        const testBtn = document.getElementById('test-api-btn');
        const originalText = testBtn.textContent;
        
        testBtn.disabled = true;
        testBtn.textContent = '🔄 测试中...';

        try {
            // 临时配置用于测试
            const testConfig = {
                provider: document.getElementById('api-provider').value,
                apiKey: document.getElementById('api-key').value.trim(),
                apiSecret: document.getElementById('api-secret').value.trim(),
                model: document.getElementById('api-model').value,
                baseURL: document.getElementById('api-base-url').value.trim()
            };

            // 创建临时AI引擎实例进行测试
            const testEngine = new AIEngine();
            testEngine.configureAPI(testConfig);

            // 发送测试请求
            const testMessages = [
                {
                    role: 'user',
                    content: '你好，这是一个API连接测试。请简单回复"连接成功"。'
                }
            ];

            const response = await testEngine.callAPI(testMessages, { maxTokens: 50 });
            
            if (response && response.trim()) {
                this.showMessage('✅ API连接测试成功！', 'success');
                this.updateStatus('connected');
            } else {
                this.showMessage('⚠️ API连接成功，但响应为空', 'warning');
            }

        } catch (error) {
            console.error('API测试失败:', error);
            this.showMessage('❌ API连接测试失败: ' + error.message, 'error');
            this.updateStatus('error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }

    // 更新状态显示
    updateStatus(status = null) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');

        if (status === null) {
            // 根据当前配置判断状态
            if (window.aiEngine && window.aiEngine.useRealAPI) {
                status = 'configured';
            } else {
                status = 'not_configured';
            }
        }

        switch (status) {
            case 'not_configured':
                indicator.textContent = '⚪';
                statusText.textContent = '未配置 - 使用本地模拟模式';
                statusText.className = 'status-not-configured';
                break;
            case 'configured':
                indicator.textContent = '🟡';
                statusText.textContent = '已配置 - 使用API模式';
                statusText.className = 'status-configured';
                break;
            case 'connected':
                indicator.textContent = '🟢';
                statusText.textContent = '连接正常 - API工作正常';
                statusText.className = 'status-connected';
                break;
            case 'error':
                indicator.textContent = '🔴';
                statusText.textContent = '连接错误 - 请检查配置';
                statusText.className = 'status-error';
                break;
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
        `;

        // 设置背景色
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 获取当前配置状态
    getConfigStatus() {
        return {
            configured: window.aiEngine?.useRealAPI || false,
            provider: this.currentConfig.provider || '',
            model: this.currentConfig.model || '',
            hasApiKey: !!(this.currentConfig.apiKey && this.currentConfig.apiKey.trim())
        };
    }
}

// 创建全局API配置管理器实例
window.apiConfigManager = new APIConfigManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConfigManager;
}