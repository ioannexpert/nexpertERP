const selectChanged = document.createEvent("HTMLEvents");
selectChanged.initEvent("customSelect_changed", true, true);

const selectHeader = `<div class="custom_select--header">
<span class="custom_select--icon">

</span>
<span class="custom_select--title">Select an option</span>
<span class="custom_select--dropdown">
    <i class="fa-regular fa-chevron-down"></i>
</span>
</div>
`;

function customSelect()
{
    this.nodes = {};
    //generate the uuid

}

customSelect.prototype.init = function(node, extraClassesHeader = [], label = undefined)
{
    //generate the uuid 
    let uuid = window.crypto.randomUUID();
    node.dataset.uuid = uuid;
    this.nodes[uuid] = {"node": node};

    if (label !== undefined)
        node.dataset.label = label;

    //first select the options
    let options = node.querySelectorAll("customOption");

    //now build the custom select 
    Array.from(node.children).forEach(child=>child.remove());

    let headerTemp = document.createRange().createContextualFragment(selectHeader);

    extraClassesHeader.forEach((c)=>{
        headerTemp.children[0].classList.add(c);
    })
    
    headerTemp.querySelector(".custom_select--title").textContent = node.dataset?.default || "Select an option";
    node.appendChild(headerTemp);

    let optionParent = document.createElement("div");
    optionParent.className = "custom_select--options";

    let defaultNode = null;

    //build the options object 
    Array.from(options).forEach((option_elem, _index)=>{
        //check for icon 
        let i = option_elem.querySelector("i");
        let textNode = option_elem.innerText.trim();
        let optionValue = option_elem.dataset.value || textNode;

        let optionNode = document.createElement("div");
        optionNode.dataset.value = optionValue;
        optionNode.className = "custom_select--option";
        i!== null && optionNode.appendChild(i);
        optionNode.appendChild(document.createTextNode(textNode));

        optionNode.onclick = (ev)=>{
            this.pickOption(node, optionValue, i, textNode, optionNode)
        }
        
        optionParent.appendChild(optionNode);

        defaultNode = option_elem.dataset.default == 'true' ? optionNode : defaultNode;
    })  

    let optionParentContainer = document.createElement("div");
    optionParentContainer.className = "custom_select--options_fake_container";


    let option_container = document.createElement("div");
    option_container.className = "custom_select--options_container";
    optionParentContainer.appendChild(optionParent);
    option_container.appendChild(optionParentContainer);

    node.appendChild(option_container);


    //listeners 
    node.onclick = ()=>{
        node.classList.toggle("active");
    }
    console.log(defaultNode);
    this.pickDefault(defaultNode);
}

customSelect.prototype.pickDefault = function(option){
    if (option)
    {
        option.click();
        option.click();
    }
}

customSelect.prototype.pickOption = function (node, optionValue, optionI, optionText, optionNode, silent)
{
    let uuid = node.dataset.uuid;
    let prev = this.nodes[uuid].value;
    //pick the option 
    this.nodes[uuid].value = optionValue;

    //change the header and trigger an event 
    let header = node.querySelector(".custom_select--header");
    
    header.querySelector(".custom_select--icon i")?.remove();

    if (optionI)
    {
        header.querySelector(".custom_select--icon").appendChild(optionI.cloneNode());
    }

    //remove class from  previous checked option Node 
    node.querySelector(".custom_select--option.checked")?.classList.remove("checked"); 

    header.querySelector(".custom_select--title").textContent = optionText;
    optionNode.classList.add("checked");

    !silent && node.dispatchEvent(new CustomEvent("customSelect_changed",{
        detail: {
            "value": optionValue,
            "prev": prev
        }
    }))
}

customSelect.prototype.getPickedOption = function(node)
{
    let uuid = node.dataset.uuid;

    return this.nodes[uuid]?.value || null;
}

customSelect.prototype.selectOption = function(node, optionValue, silent = true)
{
    let optionNode = node.querySelector(`.custom_select--option[data-value='${optionValue}']`);
    if (optionNode)
    {
        this.pickOption(node, optionValue, optionNode.querySelector("i"), optionNode.innerText.trim(), optionNode, silent);
    }
}