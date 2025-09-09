/**
 * API配置管理模块
 * 管理各种AI服务提供商的API配置
 */

class APIConfigManager {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseURL: 'https://api.openai.com/v1',
                models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
                defaultModel: 'gpt-3.5-turbo'
            },
            claude: {
                name: 'Claude (Anthropic)',
                baseURL: 'https://api.anthropic.com/v1',
                models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
                defaultModel: 'claude-3-haiku-20240307'
            },
            qwen: {
                name: '通义千问',
                baseURL: 'https://dashscope.aliyuncs.com/api/v1',
                models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
                defaultModel: 'qwen-turbo'
            },
            ernie: {
                name: '文心一言',
                baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
                models: ['ernie-bot', 'ernie-bot-turbo', 'ernie-bot-4'],
                defaultModel: 'ernie-bot-turbo'
            },
            gemini: {
                name: 'Gemini',
                baseURL: 'https://generativelanguage.googleapis.com/v1',
                models: ['gemini-pro', 'gemini-pro-vision'],
                defaultModel: 'gemini-pro'
            }
        };
        
        this.currentConfig = this.loadConfig();
        this.modal = null;
        this.initModal();
    }

    initModal() {
        // 创建模态框HTML
        const modalHTML = `
            <div id="api-config-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🤖 AI服务配置</h3>
                        <button class="modal-close" id="api-modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="config-status" id="config-status">
                            <span class="status-indicator" id="status-indicator">⚪</span>
                            <span id="status-text">未配置AI服务</span>
                        </div>
                        
                        <div class="provider-tabs" id="provider-tabs">
                            ${Object.keys(this.providers).map(key => `
                                <button class="provider-tab ${key === 'openai' ? 'active' : ''}" data-provider="${key}">
                                    ${this.providers[key].name}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="provider-content">
                            ${Object.keys(this.providers).map(key => this.createProviderForm(key)).join('')}
                        </div>
                        
                        <div class="test-result" id="test-result" style="display: none;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="clear-config-btn">清除配置</button>
                        <button class="btn btn-primary" id="test-config-btn">🧪 测试连接</button>
                        <button class="btn btn-primary" id="save-config-btn">💾 保存配置</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('api-config-modal');
        
        // 绑定事件
        this.bindEvents();
        
        // 更新状态显示
        this.updateStatus();
    }

    createProviderForm(providerKey) {
        const provider = this.providers[providerKey];
        const config = this.currentConfig[providerKey] || {};
        
        return `
            <div class="provider-form ${providerKey === 'openai' ? 'active' : ''}" data-provider="${providerKey}">
                <div class="provider-info">
                    <h5>${provider.name} 配置</h5>
                    <div class="form-group">
                        <label for="${providerKey}-api-key">API密钥</label>
                        <input type="password" id="${providerKey}-api-key" class="form-control" 
                               value="${config.apiKey || ''}" placeholder="请输入API密钥">
                        <small class="help-text">您的API密钥将安全存储在本地浏览器中</small>
                    </div>
                    <div class="form-group">
                        <label for="${providerKey}-model">模型选择</label>
                        <select id="${providerKey}-model" class="form-control">
                            ${provider.models.map(model => `
                                <option value="${model}" ${config.model === model ? 'selected' : ''}>
                                    ${model}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    ${this.getProviderSpecificFields(providerKey, config)}
                </div>
            </div>
        `;
    }

    getProviderSpecificFields(providerKey, config) {
        switch (providerKey) {
            case 'openai':
                return `
                    <div class="form-group">
                        <label for="openai-base-url">API基础URL（可选）</label>
                        <input type="text" id="openai-base-url" class="form-control" 
                               value="${config.baseURL || this.providers.openai.baseURL}" 
                               placeholder="${this.providers.openai.baseURL}">
                        <small class="help-text">如使用代理或第三方服务，可修改此URL</small>
                    </div>
                `;
            case 'claude':
                return `
                    <div class="provider-note">
                        <p><strong>获取API密钥：</strong></p>
                        <ol>
                            <li>访问 <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></li>
                            <li>创建账户并完成验证</li>
                            <li>在API Keys页面创建新的API密钥</li>
                        </ol>
                    </div>
                `;
            case 'qwen':
                return `
                    <div class="provider-note">
                        <p><strong>获取API密钥：</strong></p>
                        <ol>
                            <li>访问 <a href="https://dashscope.aliyun.com/" target="_blank">阿里云灵积</a></li>
                            <li>登录阿里云账户</li>
                            <li>在API-KEY管理页面创建新密钥</li>
                        </ol>
                    </div>
                `;
            case 'ernie':
                return `
                    <div class="form-group">
                        <label for="ernie-client-id">Client ID</label>
                        <input type="text" id="ernie-client-id" class="form-control" 
                               value="${config.clientId || ''}" placeholder="请输入Client ID">
                    </div>
                    <div class="form-group">
                        <label for="ernie-client-secret">Client Secret</label>
                        <input type="password" id="ernie-client-secret" class="form-control" 
                               value="${config.clientSecret || ''}" placeholder="请输入Client Secret">
                    </div>
                    <div class="provider-note">
                        <p><strong>获取API密钥：</strong></p>
                        <ol>
                            <li>访问 <a href="https://console.bce.baidu.com/qianfan/" target="_blank">百度千帆</a></li>
                            <li>创建应用获取API Key和Secret Key</li>
                        </ol>
                    </div>
                `;
            case 'gemini':
                return `
                    <div class="provider-note">
                        <p><strong>获取API密钥：</strong></p>
                        <ol>
                            <li>访问 <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
                            <li>创建新的API密钥</li>
                        </ol>
                    </div>
                `;
            default:
                return '';
        }
    }

    bindEvents() {
        // 关闭模态框
        document.getElementById('api-modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // 点击背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // 提供商标签切换
        document.querySelectorAll('.provider-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const provider = e.target.dataset.provider;
                this.switchProvider(provider);
            });
        });

        // 保存配置
        document.getElementById('save-config-btn').addEventListener('click', () => {
            this.saveCurrentConfig();
        });

        // 测试连接
        document.getElementById('test-config-btn').addEventListener('click', () => {
            this.testConnection();
        });

        // 清除配置
        document.getElementById('clear-config-btn').addEventListener('click', () => {
            this.clearConfig();
        });
    }

    switchProvider(providerKey) {
        // 更新标签状态
        document.querySelectorAll('.provider-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-provider="${providerKey}"]`).classList.add('active');

        // 更新表单显示
        document.querySelectorAll('.provider-form').forEach(form => {
            form.classList.remove('active');
        });
        document.querySelector(`.provider-form[data-provider="${providerKey}"]`).classList.add('active');
    }

    showModal() {
        this.modal.classList.remove('hidden');
        this.updateStatus();
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('ai-api-config');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('加载API配置失败:', error);
            return {};
        }
    }

    saveConfig(config) {
        try {
            localStorage.setItem('ai-api-config', JSON.stringify(config));
            this.currentConfig = config;
            this.updateStatus();
            
            // 触发配置更新事件
            window.dispatchEvent(new CustomEvent('aiConfigUpdated', {
                detail: this.getActiveConfig()
            }));
        } catch (error) {
            console.error('保存API配置失败:', error);
            throw error;
        }
    }

    saveCurrentConfig() {
        const activeProvider = document.querySelector('.provider-tab.active').dataset.provider;
        const form = document.querySelector(`.provider-form[data-provider="${activeProvider}"]`);
        
        const config = { ...this.currentConfig };
        
        // 获取表单数据
        const apiKey = form.querySelector(`#${activeProvider}-api-key`).value.trim();
        const model = form.querySelector(`#${activeProvider}-model`).value;
        
        if (!apiKey) {
            this.showTestResult('请输入API密钥', 'error');
            return;
        }
        
        config[activeProvider] = { apiKey, model };
        
        // 处理特殊字段
        if (activeProvider === 'openai') {
            const baseURL = form.querySelector('#openai-base-url').value.trim();
            if (baseURL) config[activeProvider].baseURL = baseURL;
        } else if (activeProvider === 'ernie') {
            const clientId = form.querySelector('#ernie-client-id').value.trim();
            const clientSecret = form.querySelector('#ernie-client-secret').value.trim();
            if (clientId && clientSecret) {
                config[activeProvider].clientId = clientId;
                config[activeProvider].clientSecret = clientSecret;
            }
        }
        
        // 设置活跃提供商
        config.activeProvider = activeProvider;
        
        try {
            this.saveConfig(config);
            this.showTestResult('✅ 配置保存成功！', 'success');
            
            // 2秒后关闭模态框
            setTimeout(() => {
                this.hideModal();
            }, 2000);
        } catch (error) {
            this.showTestResult('❌ 保存配置失败', 'error');
        }
    }

    async testConnection() {
        const activeProvider = document.querySelector('.provider-tab.active').dataset.provider;
        const form = document.querySelector(`.provider-form[data-provider="${activeProvider}"]`);
        
        const apiKey = form.querySelector(`#${activeProvider}-api-key`).value.trim();
        const model = form.querySelector(`#${activeProvider}-model`).value;
        
        if (!apiKey) {
            this.showTestResult('请先输入API密钥', 'error');
            return;
        }
        
        this.showTestResult('🔄 正在测试连接...', 'loading');
        
        try {
            const testConfig = { apiKey, model, provider: activeProvider };
            
            // 处理特殊配置
            if (activeProvider === 'openai') {
                const baseURL = form.querySelector('#openai-base-url').value.trim();
                if (baseURL) testConfig.baseURL = baseURL;
            } else if (activeProvider === 'ernie') {
                const clientId = form.querySelector('#ernie-client-id').value.trim();
                const clientSecret = form.querySelector('#ernie-client-secret').value.trim();
                testConfig.clientId = clientId;
                testConfig.clientSecret = clientSecret;
            }
            
            const result = await this.testAPI(testConfig);
            
            if (result.success) {
                this.showTestResult('✅ 连接测试成功！API配置正常', 'success');
            } else {
                this.showTestResult(`❌ 连接测试失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showTestResult(`❌ 测试失败: ${error.message}`, 'error');
        }
    }

    async testAPI(config) {
        try {
            // 这里实现具体的API测试逻辑
            const testMessage = "Hello";
            
            switch (config.provider) {
                case 'openai':
                    return await this.testOpenAI(config, testMessage);
                case 'claude':
                    return await this.testClaude(config, testMessage);
                case 'qwen':
                    return await this.testQwen(config, testMessage);
                case 'ernie':
                    return await this.testErnie(config, testMessage);
                case 'gemini':
                    return await this.testGemini(config, testMessage);
                default:
                    throw new Error('不支持的API提供商');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testOpenAI(config, message) {
        const response = await fetch(`${config.baseURL || this.providers.openai.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: message }],
                max_tokens: 10
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        return { success: true };
    }

    async testClaude(config, message) {
        const response = await fetch(`${this.providers.claude.baseURL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 10,
                messages: [{ role: 'user', content: message }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        return { success: true };
    }

    async testQwen(config, message) {
        const response = await fetch(`${this.providers.qwen.baseURL}/services/aigc/text-generation/generation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                input: { messages: [{ role: 'user', content: message }] },
                parameters: { max_tokens: 10 }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '请求失败');
        }

        return { success: true };
    }

    async testErnie(config, message) {
        // 文心一言需要先获取access_token
        const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.clientId}&client_secret=${config.clientSecret}`, {
            method: 'POST'
        });

        if (!tokenResponse.ok) {
            throw new Error('获取访问令牌失败');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const response = await fetch(`${this.providers.ernie.baseURL}/wenxinworkshop/chat/completions?access_token=${accessToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: message }],
                max_output_tokens: 10
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_msg || '请求失败');
        }

        return { success: true };
    }

    async testGemini(config, message) {
        const response = await fetch(`${this.providers.gemini.baseURL}/models/${config.model}:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        return { success: true };
    }

    clearConfig() {
        if (confirm('确定要清除所有AI配置吗？这将删除所有已保存的API密钥。')) {
            localStorage.removeItem('ai-api-config');
            this.currentConfig = {};
            this.updateStatus();
            this.showTestResult('✅ 配置已清除', 'success');
            
            // 清空表单
            document.querySelectorAll('.provider-form input, .provider-form select').forEach(input => {
                if (input.type === 'password' || input.type === 'text') {
                    input.value = '';
                } else if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                }
            });
            
            // 触发配置清除事件
            window.dispatchEvent(new CustomEvent('aiConfigCleared'));
            
            setTimeout(() => {
                this.hideModal();
            }, 2000);
        }
    }

    showTestResult(message, type) {
        const resultDiv = document.getElementById('test-result');
        resultDiv.style.display = 'block';
        resultDiv.className = `test-result ${type}`;
        resultDiv.textContent = message;
        
        if (type !== 'loading') {
            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 5000);
        }
    }

    updateStatus() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (!statusIndicator || !statusText) return;
        
        const activeConfig = this.getActiveConfig();
        
        if (activeConfig) {
            statusIndicator.textContent = '🟢';
            statusText.textContent = `已配置 ${this.providers[activeConfig.provider].name} - ${activeConfig.model}`;
        } else {
            statusIndicator.textContent = '⚪';
            statusText.textContent = '未配置AI服务（使用本地模拟模式）';
        }
    }

    getActiveConfig() {
        if (!this.currentConfig.activeProvider) return null;
        
        const provider = this.currentConfig.activeProvider;
        const config = this.currentConfig[provider];
        
        if (!config || !config.apiKey) return null;
        
        return {
            provider,
            ...config,
            providerName: this.providers[provider].name
        };
    }

    getConfigStatus() {
        const activeConfig = this.getActiveConfig();
        return {
            configured: !!activeConfig,
            provider: activeConfig?.providerName || null,
            model: activeConfig?.model || null
        };
    }
}

// 初始化API配置管理器
document.addEventListener('DOMContentLoaded', () => {
    window.apiConfigManager = new APIConfigManager();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConfigManager;
}