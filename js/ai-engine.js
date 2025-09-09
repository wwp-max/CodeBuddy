/**
 * AI引擎模块
 * 提供本地AI推理功能，包括文本分析、摘要生成、关键词提取等
 */

class AIEngine {
    constructor() {
        this.isInitialized = false;
        this.models = {
            textAnalysis: null,
            summarization: null,
            keywordExtraction: null
        };
        this.init();
    }

    async init() {
        try {
            // 模拟AI模型初始化
            console.log('AI引擎初始化中...');
            await this.loadModels();
            this.isInitialized = true;
            console.log('AI引擎初始化完成');
        } catch (error) {
            console.error('AI引擎初始化失败:', error);
            this.isInitialized = false;
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

    // 文本摘要生成
    async generateSummary(text, maxLength = 200) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 50) {
            return '文本内容太短，无法生成摘要';
        }

        // 模拟AI摘要生成
        return new Promise(resolve => {
            setTimeout(() => {
                const sentences = this.extractSentences(text);
                const importantSentences = this.selectImportantSentences(sentences, maxLength);
                const summary = importantSentences.join(' ');
                resolve(summary || '无法生成有效摘要');
            }, 1500);
        });
    }

    // 关键词提取
    async extractKeywords(text, maxKeywords = 10) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        if (!text || text.trim().length < 20) {
            return [];
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const keywords = this.performKeywordExtraction(text, maxKeywords);
                resolve(keywords);
            }, 1000);
        });
    }

    // 知识点提取
    async extractKnowledgePoints(text) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const points = this.identifyKnowledgePoints(text);
                resolve(points);
            }, 1200);
        });
    }

    // 生成练习题
    async generateQuestions(text, questionCount = 5) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const questions = this.createQuestions(text, questionCount);
                resolve(questions);
            }, 2000);
        });
    }

    // 学习计划生成
    async generateStudyPlan(notes, timeframe = 'week') {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const plan = this.createStudyPlan(notes, timeframe);
                resolve(plan);
            }, 1800);
        });
    }

    // 概念关系分析
    async analyzeConceptRelations(text) {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const relations = this.findConceptRelations(text);
                resolve(relations);
            }, 1500);
        });
    }

    // 辅助方法：提取句子
    extractSentences(text) {
        return text.split(/[。！？.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 10);
    }

    // 辅助方法：选择重要句子
    selectImportantSentences(sentences, maxLength) {
        // 简单的启发式算法选择重要句子
        const scored = sentences.map(sentence => ({
            text: sentence,
            score: this.calculateSentenceScore(sentence)
        }));

        scored.sort((a, b) => b.score - a.score);
        
        const selected = [];
        let currentLength = 0;
        
        for (const item of scored) {
            if (currentLength + item.text.length <= maxLength) {
                selected.push(item.text);
                currentLength += item.text.length;
            }
        }

        return selected.slice(0, 3); // 最多3句
    }

    // 辅助方法：计算句子重要性分数
    calculateSentenceScore(sentence) {
        let score = 0;
        
        // 长度权重
        score += Math.min(sentence.length / 50, 2);
        
        // 关键词权重
        const keywords = ['重要', '关键', '核心', '主要', '基本', '原理', '概念', '定义'];
        keywords.forEach(keyword => {
            if (sentence.includes(keyword)) score += 1;
        });
        
        // 数字和专业术语权重
        if (/\d+/.test(sentence)) score += 0.5;
        if (/[A-Z]{2,}/.test(sentence)) score += 0.5;
        
        return score;
    }

    // 辅助方法：关键词提取实现
    performKeywordExtraction(text, maxKeywords) {
        // 简单的TF-IDF模拟
        const words = text.toLowerCase()
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 1);

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // 过滤停用词
        const stopWords = new Set(['的', '是', '在', '有', '和', '与', '或', '但', '而', '了', '着', '过', '也', '都', '很', '就', '要', '会', '能', '可以', 'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by']);

        const keywords = Object.entries(wordFreq)
            .filter(([word]) => !stopWords.has(word) && word.length > 1)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxKeywords)
            .map(([word, freq]) => ({ word, frequency: freq, relevance: freq / words.length }));

        return keywords;
    }

    // 辅助方法：识别知识点
    identifyKnowledgePoints(text) {
        const sentences = this.extractSentences(text);
        const points = [];

        sentences.forEach((sentence, index) => {
            // 识别定义性句子
            if (sentence.includes('是') || sentence.includes('定义为') || sentence.includes('指的是')) {
                points.push({
                    type: 'definition',
                    content: sentence,
                    importance: 'high',
                    position: index
                });
            }
            
            // 识别步骤性句子
            if (/第[一二三四五六七八九十\d]+步|首先|然后|接着|最后/.test(sentence)) {
                points.push({
                    type: 'step',
                    content: sentence,
                    importance: 'medium',
                    position: index
                });
            }
            
            // 识别重要概念
            if (/重要|关键|核心|主要/.test(sentence)) {
                points.push({
                    type: 'concept',
                    content: sentence,
                    importance: 'high',
                    position: index
                });
            }
        });

        return points;
    }

    // 辅助方法：创建练习题
    createQuestions(text, questionCount) {
        const sentences = this.extractSentences(text);
        const keywords = this.performKeywordExtraction(text, 20);
        const questions = [];

        // 生成不同类型的问题
        const questionTypes = [
            { type: 'fill_blank', template: '请填空：{}' },
            { type: 'choice', template: '关于{}，以下哪个说法是正确的？' },
            { type: 'short_answer', template: '请简述{}的含义。' },
            { type: 'true_false', template: '判断正误：{}' }
        ];

        for (let i = 0; i < Math.min(questionCount, sentences.length); i++) {
            const sentence = sentences[i];
            const questionType = questionTypes[i % questionTypes.length];
            const keyword = keywords[i % keywords.length];

            let question = {
                id: `q_${Date.now()}_${i}`,
                type: questionType.type,
                question: questionType.template.replace('{}', keyword ? keyword.word : '相关概念'),
                context: sentence,
                difficulty: 'medium',
                createdAt: new Date().toISOString()
            };

            // 为选择题生成选项
            if (questionType.type === 'choice') {
                question.options = [
                    '选项A：正确答案',
                    '选项B：干扰项1',
                    '选项C：干扰项2',
                    '选项D：干扰项3'
                ];
                question.correctAnswer = 'A';
            }

            questions.push(question);
        }

        return questions;
    }

    // 辅助方法：创建学习计划
    createStudyPlan(notes, timeframe) {
        const plan = {
            timeframe,
            createdAt: new Date().toISOString(),
            totalNotes: notes.length,
            estimatedHours: notes.length * 0.5, // 每个笔记预计0.5小时
            phases: []
        };

        // 根据时间框架分配学习阶段
        const phases = timeframe === 'week' ? 
            ['复习基础概念', '深入理解', '练习应用', '总结巩固'] :
            ['初步学习', '深入研究', '实践应用', '复习总结', '拓展学习'];

        phases.forEach((phase, index) => {
            const phaseNotes = notes.slice(
                Math.floor(index * notes.length / phases.length),
                Math.floor((index + 1) * notes.length / phases.length)
            );

            plan.phases.push({
                name: phase,
                order: index + 1,
                notes: phaseNotes.map(note => ({
                    id: note.id,
                    title: note.title,
                    estimatedTime: 30 // 分钟
                })),
                tasks: [
                    `阅读并理解${phaseNotes.length}个笔记`,
                    `完成相关练习题`,
                    `总结关键概念`
                ],
                estimatedDays: Math.ceil(phaseNotes.length / 2)
            });
        });

        return plan;
    }

    // 辅助方法：查找概念关系
    findConceptRelations(text) {
        const keywords = this.performKeywordExtraction(text, 15);
        const relations = [];

        // 简单的共现关系分析
        for (let i = 0; i < keywords.length; i++) {
            for (let j = i + 1; j < keywords.length; j++) {
                const word1 = keywords[i].word;
                const word2 = keywords[j].word;
                
                // 检查两个词是否在同一句子中出现
                const sentences = this.extractSentences(text);
                const cooccurrence = sentences.filter(sentence => 
                    sentence.includes(word1) && sentence.includes(word2)
                ).length;

                if (cooccurrence > 0) {
                    relations.push({
                        source: word1,
                        target: word2,
                        strength: cooccurrence,
                        type: 'cooccurrence'
                    });
                }
            }
        }

        return relations.sort((a, b) => b.strength - a.strength).slice(0, 10);
    }

    // 智能问答
    async answerQuestion(question, context = '') {
        if (!this.isInitialized) {
            throw new Error('AI引擎未初始化');
        }

        return new Promise(resolve => {
            setTimeout(() => {
                // 模拟智能问答
                const answer = this.generateAnswer(question, context);
                resolve(answer);
            }, 1500);
        });
    }

    // 辅助方法：生成答案
    generateAnswer(question, context) {
        const responses = [
            '根据提供的内容，我认为这个问题涉及到几个关键概念...',
            '这是一个很好的问题。让我从以下几个方面来分析...',
            '基于上下文信息，我可以为您提供以下解释...',
            '这个概念可以从多个角度来理解...'
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            answer: randomResponse,
            confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
            sources: context ? ['当前笔记内容'] : [],
            suggestions: [
                '建议查阅相关资料以获得更深入的理解',
                '可以尝试通过实例来加深理解',
                '建议与其他相关概念进行对比学习'
            ]
        };
    }

    // 获取AI引擎状态
    getStatus() {
        return {
            initialized: this.isInitialized,
            models: Object.keys(this.models).map(key => ({
                name: key,
                loaded: this.models[key]?.loaded || false
            })),
            capabilities: [
                '文本摘要生成',
                '关键词提取',
                '知识点识别',
                '练习题生成',
                '学习计划制定',
                '概念关系分析',
                '智能问答'
            ]
        };
    }
}

// 创建全局AI引擎实例
window.aiEngine = new AIEngine();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIEngine;
}