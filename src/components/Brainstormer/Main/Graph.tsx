// @flow
/*
  Copyright(c) 2018 Uber Technologies, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

          http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/*
  Example usage of GraphView component
*/

import * as React from 'react';

import { GraphView, INode, IEdge } from 'react-digraph';
import sample from './defaultGraphState';

type LayoutEngineType = any;
import GraphConfig, {
    edgeTypes,
    EMPTY_EDGE_TYPE,
    EMPTY_TYPE,
    NODE_KEY,
    nodeTypes,
    POLY_TYPE,
    SPECIAL_CHILD_SUBTYPE,
    SPECIAL_EDGE_TYPE,
    SPECIAL_TYPE,
    SKINNY_TYPE,
} from './graph-config'; // Configures node/edge types
import { Sidebar } from '../Sidebar';
import { IGraph } from './';

function generateSample(totalNodes: number) {
    const generatedSample: IGraph = {
        edges: [],
        nodes: [],
    };
    let y = 0;
    let x = 0;

    const numNodes = totalNodes ? totalNodes : 0;
    // generate large array of nodes
    // These loops are fast enough. 1000 nodes = .45ms + .34ms
    // 2000 nodes = .86ms + .68ms
    // implying a linear relationship with number of nodes.
    for (let i = 1; i <= numNodes; i++) {
        if (i % 20 === 0) {
            y++;
            x = 0;
        } else {
            x++;
        }
        generatedSample.nodes.push({
            id: `a${i}`,
            title: `Node ${i}`,
            type: nodeTypes[Math.floor(nodeTypes.length * Math.random())],
            x: 0 + 200 * x,
            y: 0 + 200 * y,
        });
    }
    // link each node to another node
    for (let i = 1; i < numNodes; i++) {
        generatedSample.edges.push({
            source: `a${i}`,
            target: `a${i + 1}`,
            type: edgeTypes[Math.floor(edgeTypes.length * Math.random())],
        });
    }
    return generatedSample;
}

type IGraphProps = {
    onSelected(selected: INode | null): any;
};

type IGraphState = {
    graph: any;
    selected: any;
    totalNodes: number;
    copiedNode: any;
    layoutEngineType?: LayoutEngineType;
};

class Graph extends React.Component<IGraphProps, IGraphState> {
    private GraphView: React.RefObject<any>;

    constructor(props: IGraphProps) {
        super(props);

        this.state = {
            copiedNode: null,
            graph: sample,
            layoutEngineType: undefined,
            selected: null,
            totalNodes: sample.nodes.length,
        };

        this.GraphView = React.createRef();
    }
    state: IGraphState;

    // Helper to find the index of a given node
    getNodeIndex(searchNode: INode | any) {
        return this.state.graph.nodes.findIndex((node: INode) => {
            return node[NODE_KEY] === searchNode[NODE_KEY];
        });
    }

    // Helper to find the index of a given edge
    getEdgeIndex(searchEdge: IEdge) {
        return this.state.graph.edges.findIndex((edge: IEdge) => {
            return edge.source === searchEdge.source && edge.target === searchEdge.target;
        });
    }

    // Given a nodeKey, return the corresponding node
    getViewNode(nodeKey: string) {
        const searchNode: any = {};
        searchNode[NODE_KEY] = nodeKey;
        const i = this.getNodeIndex(searchNode);
        return this.state.graph.nodes[i];
    }

    makeItLarge = () => {
        const graph = this.state.graph;
        const generatedSample = generateSample(this.state.totalNodes);
        graph.nodes = generatedSample.nodes;
        graph.edges = generatedSample.edges;
        this.setState(this.state);
    };

    addStartNode = () => {
        // @ts-ignore
        const input = (window as any).prompt('Name this node:') || 'New input';
        this.addNode(input);
    };
    addRandomNode = () => {
        this.addNode('Auto-generated node');
    };

    addNode = (title: string) => {
        const graph = this.state.graph;
        // using a new array like this creates a new memory reference
        // this will force a re-render

        const newNode: INode = {
            id: Date.now(),
            title,
            type: SPECIAL_TYPE,
            x: 50,
            y: 50,
        };

        graph.nodes = [newNode, ...this.state.graph.nodes];
        this.setState({
            graph,
            selected: newNode,
        });
    };

    deleteStartNode = () => {
        const graph = this.state.graph;
        graph.nodes.splice(0, 1);
        // using a new array like this creates a new memory reference
        // this will force a re-render
        graph.nodes = [...this.state.graph.nodes];
        this.setState({
            graph,
        });
    };

    handleChange = (event: any) => {
        this.setState(
            {
                totalNodes: parseInt(event.target.value || '0', 10),
            },
            this.makeItLarge
        );
    };

    /*
     * Handlers/Interaction
     */

    // Called by 'drag' handler, etc..
    // to sync updates from D3 with the graph
    onUpdateNode = (viewNode: INode) => {
        const graph = this.state.graph;
        const i = this.getNodeIndex(viewNode);

        graph.nodes[i] = viewNode;
        this.setState({ graph });
    };

    // Node 'mouseUp' handler
    onSelectNode = (viewNode: INode | null) => {
        // Deselect events will send Null viewNode
        this.setState({ selected: viewNode });
        this.props.onSelected(viewNode);
    };

    // Edge 'mouseUp' handler
    onSelectEdge = (viewEdge: IEdge) => {
        this.setState({ selected: viewEdge });
    };

    // Updates the graph with a new node
    onCreateNode = (x: number, y: number) => {
        const graph = this.state.graph;

        // This is just an example - any sort of logic
        // could be used here to determine node type
        // There is also support for subtypes. (see 'sample' above)
        // The subtype geometry will underlay the 'type' geometry for a node
        const type = Math.random() < 0.25 ? SPECIAL_TYPE : EMPTY_TYPE;

        const viewNode = {
            id: Date.now(),
            title: '',
            type,
            x,
            y,
        };

        graph.nodes = [...graph.nodes, viewNode];
        this.setState({ graph });
    };

    // Deletes a node from the graph
    onDeleteNode = (viewNode: INode, nodeId: string, nodeArr: INode[]) => {
        const graph = this.state.graph;
        // Delete any connected edges
        const newEdges = graph.edges.filter((edge: IEdge, i: number) => {
            return edge.source !== viewNode[NODE_KEY] && edge.target !== viewNode[NODE_KEY];
        });
        graph.nodes = nodeArr;
        graph.edges = newEdges;

        this.setState({ graph, selected: null });
    };

    // Creates a new node between two edges
    onCreateEdge = (sourceViewNode: INode, targetViewNode: INode) => {
        const graph = this.state.graph;
        // This is just an example - any sort of logic
        // could be used here to determine edge type
        const type = sourceViewNode.type === SPECIAL_TYPE ? SPECIAL_EDGE_TYPE : EMPTY_EDGE_TYPE;

        const viewEdge = {
            source: sourceViewNode[NODE_KEY],
            target: targetViewNode[NODE_KEY],
            type,
        };

        // Only add the edge when the source node is not the same as the target
        if (viewEdge.source !== viewEdge.target) {
            graph.edges = [...graph.edges, viewEdge];
            this.setState({
                graph,
                selected: viewEdge,
            });
        }
    };

    // Called when an edge is reattached to a different target.
    onSwapEdge = (sourceViewNode: INode, targetViewNode: INode, viewEdge: IEdge) => {
        const graph = this.state.graph;
        const i = this.getEdgeIndex(viewEdge);
        const edge = JSON.parse(JSON.stringify(graph.edges[i]));

        edge.source = sourceViewNode[NODE_KEY];
        edge.target = targetViewNode[NODE_KEY];
        graph.edges[i] = edge;
        // reassign the array reference if you want the graph to re-render a swapped edge
        graph.edges = [...graph.edges];

        this.setState({
            graph,
            selected: edge,
        });
    };

    // Called when an edge is deleted
    onDeleteEdge = (viewEdge: IEdge, edges: IEdge[]) => {
        const graph = this.state.graph;
        graph.edges = edges;
        this.setState({
            graph,
            selected: null,
        });
    };

    onUndo = () => {
        // Not implemented
        console.warn('Undo is not currently implemented in the example.');
        // Normally any add, remove, or update would record the action in an array.
        // In order to undo it one would simply call the inverse of the action performed. For instance, if someone
        // called onDeleteEdge with (viewEdge, i, edges) then an undelete would be a splicing the original viewEdge
        // into the edges array at position i.
    };

    onCopySelected = () => {
        if (this.state.selected.source) {
            console.warn('Cannot copy selected edges, try selecting a node instead.');
            return;
        }
        const x = this.state.selected.x + 10;
        const y = this.state.selected.y + 10;
        this.setState({
            copiedNode: { ...this.state.selected, x, y },
        });
    };

    onPasteSelected = () => {
        if (!this.state.copiedNode) {
            console.warn(
                'No node is currently in the copy queue. Try selecting a node and copying it with Ctrl/Command-C'
            );
        }
        const graph = this.state.graph;
        const newNode = { ...this.state.copiedNode, id: Date.now() };
        graph.nodes = [...graph.nodes, newNode];
        this.forceUpdate();
    };

    handleChangeLayoutEngineType = (event: any) => {
        this.setState({ layoutEngineType: event.target.value as LayoutEngineType | 'None' });
    };

    render() {
        const { nodes, edges } = this.state.graph;
        const selected = this.state.selected;
        const { NodeTypes, NodeSubtypes, EdgeTypes } = GraphConfig;

        return (
            <>
                <Sidebar onCustomIdeaClick={this.addStartNode} onAutoClick={this.addRandomNode} />
                <section id="graph">
                    <GraphView
                        ref={this.GraphView}
                        nodeKey={NODE_KEY}
                        nodes={nodes}
                        edges={edges}
                        selected={selected}
                        nodeTypes={NodeTypes}
                        nodeSubtypes={NodeSubtypes}
                        edgeTypes={EdgeTypes}
                        onSelectNode={this.onSelectNode}
                        onCreateNode={this.onCreateNode}
                        onUpdateNode={this.onUpdateNode}
                        onDeleteNode={this.onDeleteNode}
                        onSelectEdge={this.onSelectEdge}
                        onCreateEdge={this.onCreateEdge}
                        onSwapEdge={this.onSwapEdge}
                        onDeleteEdge={this.onDeleteEdge}
                        onUndo={this.onUndo}
                        onCopySelected={this.onCopySelected}
                        onPasteSelected={this.onPasteSelected}
                        layoutEngineType={this.state.layoutEngineType}
                    />
                </section>
            </>
        );
    }
}

export default Graph;
