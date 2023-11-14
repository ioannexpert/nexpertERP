function DynamicNodes(){}

DynamicNodes.prototype.input = function(label, placeholder = "", value="", id = "", name = "", extraClasses = "", styles = {})
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