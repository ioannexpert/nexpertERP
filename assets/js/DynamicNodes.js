function DynamicNodes(){}

DynamicNodes.prototype.input = function(label, placeholder = "", value="", id = "", name = "", extraClasses = "", styles = {}, ac = false)
{
    let node = document.createElement("label");

    Object.keys(styles).forEach((key)=>{
        node.style[key] = styles[key];
    })
    
    node.appendChild(document.createTextNode(label));
    let input = document.createElement("input");
    input.className = "input_one " + extraClasses;
    input.placeholder = placeholder;
    input.id = "";
    input.name = name;
    input.value = value;
    node.appendChild(input);

    if (ac)
    {
        let ac = this.ac_container();
        node.appendChild(ac);
        input.addEventListener("blur",()=>{
            node.classList.remove("ac_on");
        })

        input.addEventListener("focus",()=>{
            node.classList.add("ac_on");
        })
    }
    

    return node;
}

DynamicNodes.prototype.ac_container = function(){

    let ac = document.createElement("div");
    ac.className = "ac_container";
    let ac_list = document.createElement("div");
    ac_list.className = "ac_list";
    ac.appendChild(ac_list);
    
    return ac;
}

DynamicNodes.prototype.ac_item = function (text, err = false)
{
    let node = document.createElement("div");
    node.className = "ac_item " + (err ? "err": "");
    node.textContent = text;

    return node;
}

DynamicNodes.prototype.button = function (className, text, icon = undefined, styles = {}, clickData = {fn: ()=>{}, context: undefined, args: []})
{
    let node = document.createElement("button"), i = document.createElement("i");
    i.className = icon;
    node.className = className;
    
    Object.keys(styles).forEach((key)=>{
        node.style[key] = styles[key];
    })

    if (icon !== undefined)
        node.appendChild(i);

    node.appendChild(document.createTextNode(text));

    node.onclick = ()=>{
        if (clickData.context !== undefined)
        {
            clickData.fn.apply(clickData.context, clickData.args);
        }else{
            clickData.fn(...clickData.args);
        }
    }

    return node;
}

DynamicNodes.prototype.frag = function (...nodes)
{
    let frag = document.createDocumentFragment();

    nodes.forEach((node)=>{
        frag.appendChild(node);
    });

    return frag;
}

DynamicNodes.prototype.or = function(bg  = "white")
{
    let node = document.createElement("div");
    node.className = "or";
    node.style.backgroundColor = bg;
    
    return node;
}

DynamicNodes.prototype.clearAc = function(node){
    Array.from(node.querySelectorAll(".ac_item")).forEach((elem)=>{elem.remove()})
}

DynamicNodes.prototype.fillAc = function(data, node, nodeFill){
    let frag = document.createDocumentFragment();

    data.forEach((d)=>{
        
        let ac_node = this.ac_item(d, nodeFill===undefined);

        nodeFill!==undefined && ac_node.addEventListener("click",()=>{
            nodeFill.value = d;
            //we should delete prev nodes
            Array.from(node.querySelectorAll(".ac_item")).forEach((n)=>{
                if ( n != ac_node)
                {
                    n.remove();
                }
            })
        })
        frag.appendChild(ac_node);
    })

    node.querySelector(".ac_list").appendChild(frag);
}

DynamicNodes.prototype.conditionBuilder = function()
{
    let node = document.createElement("div");
    node.className = "condition_builder--container";

    let list = document.createElement("div");
    list.className = "condition_builder--list";

    list.appendChild(this.conditionNode());

    node.appendChild(list);
    let button = this.button("primary_button maxW","Add Condition", "fa-regular fa-plus", {});
    button.onclick = ()=>{
        list.appendChild(this.conditionNode());
    }

    node.appendChild(button);

    return node;
}

DynamicNodes.prototype.conditionNode = function(){
    let node = document.createElement("div");
    node.className = "condition_builder--condition";
    
    node.appendChild(document.createTextNode("Where"))

    let colSelector = new column_selector();
    node.appendChild(colSelector.getNode());

    node.appendChild(document.createTextNode("matches"));

    colSelector = new column_selector();
    node.appendChild(colSelector.getNode());

    let exit = this.exitIcon();
    exit.onclick = ()=>{
        node.remove();
    }
    node.appendChild(exit);
    return node;
}

DynamicNodes.prototype.exitIcon = function(){
    let i = document.createElement("i");
    i.className = "fa-regular fa-xmark-square";
    i.dataset.for = "close";

    return i;
}

DynamicNodes.prototype.helpCard = function (text, type)
{
    let iClass, extraClass;
    switch(type)
    {
        case "info":
            iClass = "fa-regular fa-square-info fa-beat-fade";
            extraClass = "info_card";
            break;
        default: 
            iClass = "fa-regular fa-square-info fa-beat-fade";
            extraClass = "info_card";
            break;
    }
    let node = document.createElement("div");
    node.className = "ux_card " + extraClass;

    let span = document.createElement("span");
    span.textContent = text;

    let i = document.createElement("i");
    i.className = iClass;
    node.appendChild(i);
    node.appendChild(span);

    return node;
}