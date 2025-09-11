/**
 * AI引擎模块
 * 提供本地AI推理功能和真实API调用功能，包括文本分析、摘要生成、关键词提取等
 */

class AIEngine {
    constructor() {
        this.isInitialized = false;
        this.models = {
            textAnalysis: null,
            summarization: null,
            keywordExtraction: null
        };
        this.apiConfig = null;
        this.init();
    }

    async init() {
        try {
            // 模拟AI模型初始化
            console.log('AI引擎初始化中...');
            await this.loadModels();
            
            // 加载API配置
            this.loadAPIConfig();
            
            this.isInitialized = true;
            console.log('AI引擎初始化完成');
            
            // 监听配置更新事件
            window.addEventListener('aiConfigUpdated', (e) => {
                this.loadAPIConfig();
                console.log('AI配置已更新，切换到API模式');
            });
            
            window.addEventListener('aiConfigCleared', () => {
                this.apiConfig = null;
                console.log('AI配置已清除，切换到本地模拟模式');
            });
            
        } catch (error) {
            console.error('AI引擎初始化失败:', error);
            this.isInitialized = false;
        }
    }

    loadAPIConfig() {
        if (window.apiConfigManager) {
            this.apiConfig = window.apiConfigManager.getActiveConfig();
        }
    }

    async loadModels() {
        // 模拟模型加载过程
        return new Promise(resolve => {
            setTimeout(() => {
                this.models.textAnalysis = { loaded: true };
                this.models.summarization = { loaded: true };
                this.models.keywordExtraction = { loaded: true };
                resolve();
            }, 1000);
        });
    }

    // 检查是否使用API模式
    isUsingAPI() {
        return this.apiConfig && this.apiConfig.apiKey;
    }

    // 文本摘要生成
    async generateSummary(text, maxLength = 200) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 50) {
            return '文本内容太短，无法生成摘要';
        }

        if (this.isUsingAPI()) {
            return await this.generateSummaryAPI(text, maxLength);
        } else {
            return await this.generateSummaryLocal(text, maxLength);
        }
    }

    // API模式生成摘要
    async generateSummaryAPI(text, maxLength) {
        try {
            const prompt = `请为以下文本生成一个简洁的摘要，长度控制在${maxLength}字以内：\n\n${text}`;
            const response = await this.callAPI(prompt);
            return response || '摘要生成失败';
        } catch (error) {
            console.error('API摘要生成失败:', error);
            // 降级到本地模式
            return await this.generateSummaryLocal(text, maxLength);
        }
    }

    // 本地模式生成摘要
    async generateSummaryLocal(text, maxLength) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 800));

        // 简单的摘要算法：提取关键句子
        const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 10);
        
        if (sentences.length <= 2) {
            return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
        }

        // 选择前几个句子作为摘要
        let summary = '';
        for (const sentence of sentences) {
            if (summary.length + sentence.length > maxLength) break;
            summary += sentence.trim() + '。';
        }

        return summary || text.substring(0, maxLength) + '...';
    }

    // 关键词提取
    async extractKeywords(text, count = 10) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 20) {
            return [];
        }

        if (this.isUsingAPI()) {
            return await this.extractKeywordsAPI(text, count);
        } else {
            return await this.extractKeywordsLocal(text, count);
        }
    }

    // API模式提取关键词
    async extractKeywordsAPI(text, count) {
        try {
            const prompt = `请从以下文本中提取${count}个最重要的关键词，用逗号分隔：\n\n${text}`;
            const response = await this.callAPI(prompt);
            
            if (response) {
                // 解析关键词
                const keywords = response.split(/[,，、\n]/)
                    .map(k => k.trim())
                    .filter(k => k.length > 0 && k.length < 20)
                    .slice(0, count);
                return keywords;
            }
            return [];
        } catch (error) {
            console.error('API关键词提取失败:', error);
            // 降级到本地模式
            return await this.extractKeywordsLocal(text, count);
        }
    }

    // 本地模式提取关键词
    async extractKeywordsLocal(text, count) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 600));

        // 简单的关键词提取算法
        const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
        
        // 分词（简单按标点和空格分割）
        const words = text.match(/[\u4e00-\u9fa5]+/g) || [];
        
        // 统计词频
        const wordCount = {};
        words.forEach(word => {
            if (word.length >= 2 && !stopWords.has(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // 按频率排序并返回前N个
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, count)
            .map(([word]) => word);
    }

    // 知识点分析
    async analyzeKnowledge(text) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 30) {
            return {
                concepts: [],
                definitions: [],
                steps: [],
                examples: []
            };
        }

        if (this.isUsingAPI()) {
            return await this.analyzeKnowledgeAPI(text);
        } else {
            return await this.analyzeKnowledgeLocal(text);
        }
    }

    // API模式知识点分析
    async analyzeKnowledgeAPI(text) {
        try {
            const prompt = `请分析以下文本的知识点，按以下格式返回JSON：
{
  "concepts": ["概念1", "概念2"],
  "definitions": ["定义1", "定义2"],
  "steps": ["步骤1", "步骤2"],
  "examples": ["例子1", "例子2"]
}

文本内容：
${text}`;

            const response = await this.callAPI(prompt);
            
            if (response) {
                try {
                    // 尝试解析JSON
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return {
                            concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
                            definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
                            steps: Array.isArray(parsed.steps) ? parsed.steps : [],
                            examples: Array.isArray(parsed.examples) ? parsed.examples : []
                        };
                    }
                } catch (parseError) {
                    console.warn('解析API响应失败，使用本地模式');
                }
            }
        } catch (error) {
            console.error('API知识点分析失败:', error);
        }
        
        // 降级到本地模式
        return await this.analyzeKnowledgeLocal(text);
    }

    // 本地模式知识点分析
    async analyzeKnowledgeLocal(text) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = {
            concepts: [],
            definitions: [],
            steps: [],
            examples: []
        };

        // 简单的模式匹配
        const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 5);

        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            
            // 识别定义
            if (trimmed.includes('是指') || trimmed.includes('定义为') || trimmed.includes('是一种')) {
                result.definitions.push(trimmed);
            }
            
            // 识别步骤
            if (/第[一二三四五六七八九十\d]+步|步骤\d+|首先|然后|接着|最后|第\d+/.test(trimmed)) {
                result.steps.push(trimmed);
            }
            
            // 识别例子
            if (trimmed.includes('例如') || trimmed.includes('比如') || trimmed.includes('举例')) {
                result.examples.push(trimmed);
            }
            
            // 提取概念（简单提取名词）
            const concepts = trimmed.match(/[\u4e00-\u9fa5]{2,8}(?=的|是|为|等)/g);
            if (concepts) {
                result.concepts.push(...concepts.slice(0, 3));
            }
        });

        // 去重并限制数量
        result.concepts = [...new Set(result.concepts)].slice(0, 5);
        result.definitions = [...new Set(result.definitions)].slice(0, 3);
        result.steps = [...new Set(result.steps)].slice(0, 5);
        result.examples = [...new Set(result.examples)].slice(0, 3);

        return result;
    }

    // 生成练习题
    async generateQuestions(text, count = 5) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 50) {
            return [];
        }

        if (this.isUsingAPI()) {
            return await this.generateQuestionsAPI(text, count);
        } else {
            return await this.generateQuestionsLocal(text, count);
        }
    }

    // API模式生成练习题
    async generateQuestionsAPI(text, count) {
        try {
            const prompt = `基于以下文本内容，生成${count}道练习题，包括选择题、填空题和简答题。请按以下JSON格式返回：
[
  {
    "type": "choice",
    "question": "题目",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "answer": "A"
  },
  {
    "type": "fill",
    "question": "题目（用___表示空白）",
    "answer": "答案"
  },
  {
    "type": "short",
    "question": "题目",
    "answer": "参考答案"
  }
]

文本内容：
${text}`;

            const response = await this.callAPI(prompt);
            
            if (response) {
                try {
                    const jsonMatch = response.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(parsed)) {
                            return parsed.slice(0, count);
                        }
                    }
                } catch (parseError) {
                    console.warn('解析练习题响应失败，使用本地模式');
                }
            }
        } catch (error) {
            console.error('API练习题生成失败:', error);
        }
        
        // 降级到本地模式
        return await this.generateQuestionsLocal(text, count);
    }

    // 本地模式生成练习题
    async generateQuestionsLocal(text, count) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 1200));

        const questions = [];
        const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 10);
        
        // 生成简单的练习题
        for (let i = 0; i < Math.min(count, sentences.length); i++) {
            const sentence = sentences[i].trim();
            
            if (i % 3 === 0) {
                // 选择题
                questions.push({
                    type: 'choice',
                    question: `关于"${sentence.substring(0, 20)}..."的描述，以下哪项正确？`,
                    options: [
                        sentence.substring(0, 30) + '...',
                        '这是错误选项A',
                        '这是错误选项B',
                        '这是错误选项C'
                    ],
                    answer: 'A'
                });
            } else if (i % 3 === 1) {
                // 填空题
                const words = sentence.split('');
                if (words.length > 10) {
                    const blankStart = Math.floor(words.length * 0.3);
                    const blankEnd = Math.floor(words.length * 0.6);
                    const answer = words.slice(blankStart, blankEnd).join('');
                    const question = words.slice(0, blankStart).join('') + '___' + words.slice(blankEnd).join('');
                    
                    questions.push({
                        type: 'fill',
                        question: question,
                        answer: answer
                    });
                }
            } else {
                // 简答题
                questions.push({
                    type: 'short',
                    question: `请简述：${sentence.substring(0, 30)}...`,
                    answer: sentence
                });
            }
        }

        return questions;
    }

    // 智能问答
    async answerQuestion(question, context = '') {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!question || question.trim().length < 3) {
            return '请输入有效的问题';
        }

        if (this.isUsingAPI()) {
            return await this.answerQuestionAPI(question, context);
        } else {
            return await this.answerQuestionLocal(question, context);
        }
    }

    // API模式智能问答
    async answerQuestionAPI(question, context) {
        try {
            let prompt = `请回答以下问题：${question}`;
            if (context) {
                prompt += `\n\n参考上下文：\n${context}`;
            }
            
            const response = await this.callAPI(prompt);
            return response || '抱歉，无法回答这个问题';
        } catch (error) {
            console.error('API问答失败:', error);
            // 降级到本地模式
            return await this.answerQuestionLocal(question, context);
        }
    }

    // 本地模式智能问答
    async answerQuestionLocal(question, context) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 800));

        // 简单的问答逻辑
        const q = question.toLowerCase();
        
        if (q.includes('什么是') || q.includes('什么叫')) {
            return '这是一个定义类问题。根据上下文，这个概念通常指...[本地模拟回答]';
        } else if (q.includes('如何') || q.includes('怎么')) {
            return '这是一个方法类问题。一般来说，可以通过以下步骤...[本地模拟回答]';
        } else if (q.includes('为什么') || q.includes('原因')) {
            return '这是一个原因类问题。主要原因可能包括...[本地模拟回答]';
        } else {
            return `关于"${question}"的问题，这是一个很好的问题。基于当前的知识，我认为...[本地模拟回答]`;
        }
    }

    // 调用API的通用方法
    async callAPI(prompt, maxTokens = 1000) {
        if (!this.apiConfig) {
            throw new Error('API配置未找到');
        }

        const { provider, apiKey, model } = this.apiConfig;

        switch (provider) {
            case 'openai':
                return await this.callOpenAI(prompt, maxTokens);
            case 'claude':
                return await this.callClaude(prompt, maxTokens);
            case 'qwen':
                return await this.callQwen(prompt, maxTokens);
            case 'ernie':
                return await this.callErnie(prompt, maxTokens);
            case 'gemini':
                return await this.callGemini(prompt, maxTokens);
            default:
                throw new Error(`不支持的API提供商: ${provider}`);
        }
    }

    // OpenAI API调用
    async callOpenAI(prompt, maxTokens) {
        const baseURL = this.apiConfig.baseURL || 'https://api.openai.com/v1';
        
        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: this.apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    // Claude API调用
    async callClaude(prompt, maxTokens) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiConfig.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.apiConfig.model,
                max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const data = await response.json();
        return data.content[0]?.text || '';
    }

    // 通义千问API调用
    async callQwen(prompt, maxTokens) {
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: this.apiConfig.model,
                input: {
                    messages: [{ role: 'user', content: prompt }]
                },
                parameters: {
                    max_tokens: maxTokens,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '请求失败');
        }

        const data = await response.json();
        return data.output?.text || '';
    }

    // 文心一言API调用
    async callErnie(prompt, maxTokens) {
        // 文心一言需要先获取access_token
        const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiConfig.clientId}&client_secret=${this.apiConfig.clientSecret}`, {
            method: 'POST'
        });

        if (!tokenResponse.ok) {
            throw new Error('获取访问令牌失败');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const response = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${accessToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                max_output_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_msg || '请求失败');
        }

        const data = await response.json();
        return data.result || '';
    }

    // Gemini API调用
    async callGemini(prompt, maxTokens) {
        // 处理不同版本的Gemini模型
        const isGemini25 = this.apiConfig.model.startsWith('gemini-2.5');
        const isGemini2 = this.apiConfig.model.startsWith('gemini-2');
        
        // Gemini 2.5使用最新的API配置
        const generationConfig = {
            maxOutputTokens: maxTokens,
            temperature: 0.7
        };
        
        // 为Gemini 2.5和2.0添加更多配置选项
        if (isGemini25 || isGemini2) {
            generationConfig.topP = 0.95;
            generationConfig.topK = 40;
        } else {
            generationConfig.topP = 0.8;
            generationConfig.topK = 10;
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.apiConfig.model}:generateContent?key=${this.apiConfig.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ text: prompt }] 
                }],
                generationConfig
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || '';
    }

    // 分析概念关系
    async analyzeConceptRelations(content) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (this.isUsingAPI()) {
            return await this.analyzeConceptRelationsAPI(content);
        } else {
            return await this.analyzeConceptRelationsLocal(content);
        }
    }

    // API模式分析概念关系
    async analyzeConceptRelationsAPI(content) {
        try {
            const prompt = `请分析以下文本中概念之间的关系，返回JSON格式的关系列表：
文本：${content}

请返回格式如下的JSON：
[
  {
    "source": "概念A",
    "target": "概念B", 
    "relation": "包含/属于/相关/对比",
    "strength": 0.8
  }
]

只返回JSON，不要其他解释。`;

            const response = await this.callAPI(prompt);
            
            try {
                const relations = JSON.parse(response);
                return Array.isArray(relations) ? relations : [];
            } catch (parseError) {
                console.warn('解析概念关系JSON失败，使用本地模拟');
                return this.analyzeConceptRelationsLocal(content);
            }
        } catch (error) {
            console.warn('分析概念关系失败，使用本地模拟:', error);
            return this.analyzeConceptRelationsLocal(content);
        }
    }

    // 本地模式分析概念关系
    async analyzeConceptRelationsLocal(content) {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const keywords = await this.extractKeywords(content, 8);
        const relations = [];
        
        // 简单的关系推断：相邻出现的概念可能相关
        for (let i = 0; i < keywords.length - 1; i++) {
            for (let j = i + 1; j < keywords.length; j++) {
                const concept1 = keywords[i].word || keywords[i];
                const concept2 = keywords[j].word || keywords[j];
                
                // 计算概念在文本中的距离
                const pos1 = content.toLowerCase().indexOf(concept1.toLowerCase());
                const pos2 = content.toLowerCase().indexOf(concept2.toLowerCase());
                
                if (pos1 !== -1 && pos2 !== -1) {
                    const distance = Math.abs(pos1 - pos2);
                    
                    // 距离越近，关系强度越高
                    if (distance < 200) {
                        const strength = Math.max(0.3, 1 - distance / 200);
                        relations.push({
                            source: concept1,
                            target: concept2,
                            relation: '相关',
                            strength: Math.round(strength * 10) / 10
                        });
                    }
                }
            }
        }
        
        return relations.slice(0, 10); // 限制关系数量
    }

    // 获取AI状态
    getStatus() {
        return {
            initialized: this.isInitialized,
            usingAPI: this.isUsingAPI(),
            provider: this.apiConfig?.providerName || '本地模拟',
            model: this.apiConfig?.model || '本地模型'
        };
    }
}

// 初始化AI引擎
document.addEventListener('DOMContentLoaded', () => {
    window.aiEngine = new AIEngine();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIEngine;
}