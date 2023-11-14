function view_selector(view_names = [], view_nodes = [])
{
    this.activeIndex = 0;
    this.header = undefined;
    this.body = undefined;

    return this.init(view_names, view_nodes); 
}

view_selector.prototype.init = function(view_names, view_nodes){
    if (view_names.length !== view_nodes.length)
    {
        console.error("View selector not ok!");
        return;
    }
    let frame = document.createElement("div");
    frame.className = "view_selector";

    this.header = document.createElement("div");
    this.header.className = "view_selector--header";

    this.header.appendChild(this.addViewNames(view_names));
    this.header.appendChild(this.init_selectorNode(view_names.length));

    let container = document.createElement("div");
    container.className = "view_selector--container";

    this.body = document.createElement("div");
    this.body.className = "view_selector--body";

    this.body.appendChild(this.init_body(view_nodes));

    container.appendChild(this.body);

    frame.appendChild(this.header);
    frame.appendChild(container);

    this.gotoIndex(0);
    return frame;
}

view_selector.prototype.init_body = function(nodes)
{
    let frag = document.createDocumentFragment();
    nodes.forEach((node)=>{
        let parent = document.createElement("div");
        parent.className = "view_selector--body_page";
        parent.appendChild(node);

        frag.appendChild(parent);
    })

    return frag;
}

view_selector.prototype.init_selectorNode = function (elements)
{
    let node = document.createElement("div");
    node.className = "view_selector--selector";
    node.style.width = `${100/elements}%`;
    return node;
}

view_selector.prototype.addViewNames = function(view_names)
{
    let frag = document.createDocumentFragment();

    view_names.forEach((name, index)=>{
        let node = document.createElement("div");
        node.className = "view_selector--header_item";
        node.textContent = name;
        node.dataset.index = index;

        node.onclick = ()=>{
            this.gotoIndex(index);
        }

        frag.appendChild(node);
    })

    return frag;
}

view_selector.prototype.get_selector = function(){
    return this.header.querySelector(".view_selector--selector");
}

view_selector.prototype.gotoIndex = function(index){
    let headerNode = this.header.querySelector(`.view_selector--header_item[data-index='${index}']`);

    if (headerNode)
    {
        //move to this offset 
        let selector = this.get_selector();

        selector.style.transform = `translate(${headerNode.offsetLeft}px,${headerNode.offsetTop}px)`;
        
        //see the body 
        Array.from(this.body.children).forEach((page)=>{
            page.style.display = "none";
        });
        this.body.children[index].style.display = "block";
    }
}