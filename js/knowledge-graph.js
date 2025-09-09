/**
 * 知识图谱可视化模块
 * 使用 D3.js 创建交互式知识图谱
 */

class KnowledgeGraph {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.width = 800;
        this.height = 600;
        this.currentLayout = 'force';
        this.zoom = d3.zoom();
        this.init();
    }

    init() {
        this.setupSVG();
        this.setupSimulation();
        this.setupZoom();
        this.loadGraphData();
    }

    setupSVG() {
        // 清除现有内容
        this.container.selectAll('*').remove();

        // 创建SVG容器
        this.svg = this.container
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .style('background', '#fafafa');

        // 创建图层
        this.defs = this.svg.append('defs');
        this.linkGroup = this.svg.append('g').attr('class', 'links');
        this.nodeGroup = this.svg.append('g').attr('class', 'nodes');
        this.labelGroup = this.svg.append('g').attr('class', 'labels');

        // 添加箭头标记
        this.defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');
    }

    setupSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30));
    }

    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                const { transform } = event;
                this.nodeGroup.attr('transform', transform);
                this.linkGroup.attr('transform', transform);
                this.labelGroup.attr('transform', transform);
            });

        this.svg.call(this.zoom);
    }

    async loadGraphData() {
        try {
            // 从存储中加载图谱数据
            const graphData = await window.storageManager.getKnowledgeGraph();
            
            if (graphData && graphData.nodes && graphData.links) {
                this.nodes = graphData.nodes;
                this.links = graphData.links;
            } else {
                // 如果没有数据，从笔记生成图谱
                await this.generateGraphFromNotes();
            }
            
            this.render();
        } catch (error) {
            console.error('加载知识图谱失败:', error);
            this.showEmptyState();
        }
    }

    async generateGraphFromNotes() {
        try {
            const notes = await window.storageManager.getNotes();
            const { nodes, links } = await this.extractGraphFromNotes(notes);
            
            this.nodes = nodes;
            this.links = links;
            
            // 保存生成的图谱
            await window.storageManager.saveKnowledgeGraph({ nodes, links });
        } catch (error) {
            console.error('从笔记生成图谱失败:', error);
            this.nodes = [];
            this.links = [];
        }
    }

    async extractGraphFromNotes(notes) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        for (const note of notes) {
            // 为每个笔记创建一个节点
            const noteNode = {
                id: `note_${note.id}`,
                name: note.title,
                type: 'note',
                size: Math.min(Math.max(note.content.length / 100, 10), 50),
                color: '#4f46e5',
                data: note
            };
            
            nodes.push(noteNode);
            nodeMap.set(noteNode.id, noteNode);

            // 提取关键词并创建概念节点
            try {
                const keywords = await window.aiEngine.extractKeywords(note.content, 5);
                
                for (const keyword of keywords) {
                    const conceptId = `concept_${keyword.word}`;
                    
                    if (!nodeMap.has(conceptId)) {
                        const conceptNode = {
                            id: conceptId,
                            name: keyword.word,
                            type: 'concept',
                            size: 15 + keyword.frequency * 2,
                            color: '#10b981',
                            frequency: keyword.frequency
                        };
                        
                        nodes.push(conceptNode);
                        nodeMap.set(conceptId, conceptNode);
                    }

                    // 创建笔记到概念的连接
                    links.push({
                        source: noteNode.id,
                        target: conceptId,
                        type: 'contains',
                        strength: keyword.relevance,
                        weight: Math.max(keyword.frequency, 1)
                    });
                }

                // 分析概念间关系
                const relations = await window.aiEngine.analyzeConceptRelations(note.content);
                
                for (const relation of relations) {
                    const sourceId = `concept_${relation.source}`;
                    const targetId = `concept_${relation.target}`;
                    
                    if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
                        links.push({
                            source: sourceId,
                            target: targetId,
                            type: 'related',
                            strength: relation.strength,
                            weight: relation.strength
                        });
                    }
                }
            } catch (error) {
                console.warn(`处理笔记 ${note.title} 时出错:`, error);
            }
        }

        return { nodes, links };
    }

    render() {
        if (this.nodes.length === 0) {
            this.showEmptyState();
            return;
        }

        this.updateSimulation();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        this.startSimulation();
    }

    updateSimulation() {
        this.simulation
            .nodes(this.nodes)
            .force('link')
            .links(this.links);
    }

    renderLinks() {
        const link = this.linkGroup
            .selectAll('line')
            .data(this.links);

        link.exit().remove();

        const linkEnter = link.enter()
            .append('line')
            .attr('stroke', d => this.getLinkColor(d.type))
            .attr('stroke-width', d => Math.max(d.weight || 1, 1))
            .attr('stroke-opacity', 0.6)
            .attr('marker-end', d => d.type === 'related' ? 'url(#arrowhead)' : null);

        this.linkElements = linkEnter.merge(link);
    }

    renderNodes() {
        const node = this.nodeGroup
            .selectAll('circle')
            .data(this.nodes);

        node.exit().remove();

        const nodeEnter = node.enter()
            .append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .call(this.drag());

        // 添加交互事件
        nodeEnter
            .on('mouseover', (event, d) => this.showNodeTooltip(event, d))
            .on('mouseout', () => this.hideNodeTooltip())
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('dblclick', (event, d) => this.handleNodeDoubleClick(event, d));

        this.nodeElements = nodeEnter.merge(node);
    }

    renderLabels() {
        const label = this.labelGroup
            .selectAll('text')
            .data(this.nodes);

        label.exit().remove();

        const labelEnter = label.enter()
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', d => Math.max(d.size / 3, 10))
            .attr('font-weight', d => d.type === 'note' ? 'bold' : 'normal')
            .attr('fill', '#333')
            .attr('pointer-events', 'none')
            .text(d => this.truncateText(d.name, d.size));

        this.labelElements = labelEnter.merge(label);
    }

    startSimulation() {
        this.simulation.on('tick', () => {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.nodeElements
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            this.labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        this.simulation.restart();
    }

    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    showNodeTooltip(event, node) {
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        let content = `<strong>${node.name}</strong><br>`;
        content += `类型: ${node.type === 'note' ? '笔记' : '概念'}<br>`;
        
        if (node.type === 'concept' && node.frequency) {
            content += `频次: ${node.frequency}`;
        } else if (node.type === 'note' && node.data) {
            content += `字数: ${node.data.content.length}`;
        }

        tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hideNodeTooltip() {
        d3.selectAll('.graph-tooltip').remove();
    }

    handleNodeClick(event, node) {
        // 高亮选中节点及其连接
        this.highlightNode(node);
        
        // 触发自定义事件
        const customEvent = new CustomEvent('nodeClick', {
            detail: { node, event }
        });
        document.dispatchEvent(customEvent);
    }

    handleNodeDoubleClick(event, node) {
        if (node.type === 'note' && node.data) {
            // 双击笔记节点时打开笔记
            const customEvent = new CustomEvent('openNote', {
                detail: { noteId: node.data.id }
            });
            document.dispatchEvent(customEvent);
        }
    }

    highlightNode(selectedNode) {
        // 重置所有节点和连接的样式
        this.nodeElements
            .attr('opacity', 0.3)
            .attr('stroke-width', 2);

        this.linkElements
            .attr('opacity', 0.1);

        this.labelElements
            .attr('opacity', 0.3);

        // 高亮选中节点
        this.nodeElements
            .filter(d => d.id === selectedNode.id)
            .attr('opacity', 1)
            .attr('stroke-width', 4);

        // 高亮相关连接和节点
        const connectedNodeIds = new Set();
        
        this.linkElements
            .filter(d => d.source.id === selectedNode.id || d.target.id === selectedNode.id)
            .attr('opacity', 0.8)
            .each(d => {
                connectedNodeIds.add(d.source.id);
                connectedNodeIds.add(d.target.id);
            });

        this.nodeElements
            .filter(d => connectedNodeIds.has(d.id))
            .attr('opacity', 1);

        this.labelElements
            .filter(d => d.id === selectedNode.id || connectedNodeIds.has(d.id))
            .attr('opacity', 1);

        // 3秒后恢复正常
        setTimeout(() => {
            this.resetHighlight();
        }, 3000);
    }

    resetHighlight() {
        this.nodeElements
            .attr('opacity', 1)
            .attr('stroke-width', 2);

        this.linkElements
            .attr('opacity', 0.6);

        this.labelElements
            .attr('opacity', 1);
    }

    getLinkColor(type) {
        const colors = {
            'contains': '#6b7280',
            'related': '#10b981',
            'similar': '#f59e0b'
        };
        return colors[type] || '#9ca3af';
    }

    truncateText(text, maxLength) {
        const length = Math.max(maxLength / 2, 8);
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    showEmptyState() {
        this.container.selectAll('*').remove();
        
        const emptyState = this.container
            .append('div')
            .attr('class', 'empty-state')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('height', '100%')
            .style('color', '#6b7280');

        emptyState.append('div')
            .style('font-size', '4rem')
            .style('margin-bottom', '1rem')
            .text('🕸️');

        emptyState.append('h3')
            .style('margin-bottom', '0.5rem')
            .text('暂无知识图谱');

        emptyState.append('p')
            .style('text-align', 'center')
            .style('max-width', '300px')
            .text('开始创建笔记，AI将自动为您构建知识图谱，展示概念间的关联关系。');
    }

    // 布局切换
    setLayout(layoutType) {
        this.currentLayout = layoutType;
        
        switch (layoutType) {
            case 'force':
                this.applyForceLayout();
                break;
            case 'circle':
                this.applyCircleLayout();
                break;
            case 'tree':
                this.applyTreeLayout();
                break;
        }
    }

    applyForceLayout() {
        this.simulation
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30))
            .alpha(1)
            .restart();
    }

    applyCircleLayout() {
        const radius = Math.min(this.width, this.height) / 3;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        this.nodes.forEach((node, i) => {
            const angle = (i / this.nodes.length) * 2 * Math.PI;
            node.fx = centerX + radius * Math.cos(angle);
            node.fy = centerY + radius * Math.sin(angle);
        });

        this.simulation.alpha(1).restart();
    }

    applyTreeLayout() {
        // 简单的树形布局
        const root = d3.hierarchy({ children: this.nodes });
        const treeLayout = d3.tree().size([this.width - 100, this.height - 100]);
        
        treeLayout(root);
        
        root.descendants().forEach((d, i) => {
            if (this.nodes[i]) {
                this.nodes[i].fx = d.x + 50;
                this.nodes[i].fy = d.y + 50;
            }
        });

        this.simulation.alpha(1).restart();
    }

    // 缩放控制
    setZoom(scale) {
        this.svg.transition()
            .duration(300)
            .call(this.zoom.scaleTo, scale);
    }

    // 导出图片
    exportImage() {
        const svgElement = this.svg.node();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = this.width;
        canvas.height = this.height;
        
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL();
            link.click();
        };
        
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        img.src = url;
    }

    // 刷新图谱
    async refresh() {
        await this.generateGraphFromNotes();
        this.render();
    }

    // 清理资源
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        this.container.selectAll('*').remove();
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeGraph;
}