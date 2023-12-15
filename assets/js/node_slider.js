function node_slider(...nodes)
{
    this.container = undefined;
    this.nodes = undefined;
    this.init();
    this.init_nodes(nodes);
}

node_slider.prototype.init = function(){
    this.container = document.createElement("div");
    this.container.className = "node_slider--container";

    this.nodes = document.createElement("div");
    this.nodes.className = "node_slider--nodes";

    this.container.appendChild(this.nodes);
}

node_slider.prototype.get_node = function(){
    return this.container;
}

node_slider.prototype.init_nodes = function (nodes)
{
    let frag = document.createDocumentFragment();
    nodes.forEach((node)=>{
        let aux_node = document.createElement('div');
        aux_node.className = "node_slider--node";
        aux_node.appendChild(node);
        frag.appendChild(aux_node);
    })
    this.nodes.appendChild(frag);
}

node_slider.prototype.move_atIndex = function (index)
{
    if (index > this.nodes.children.length - 1)
    {
        index = this.nodes.children.length - 1;
    }

    this.nodes.style.transform = `translateX(-${index * 100}%)`;
}