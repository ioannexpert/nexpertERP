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

DynamicNodes.prototype.container = function(...nodes)
{
    let node = document.createElement('div');

    nodes.forEach((child)=>{
        node.appendChild(child);
    });

    return node;
}

DynamicNodes.prototype.conditionBuilder = function(white = false, sheetData = undefined)
{
    if (sheetData === undefined)
    {
        Toastify({
            className: "toast_error",
            text: "There was an error! Please refresh the page or select a sheet!"
        }).showToast();
        return ;
    }

    let node = document.createElement("div");
    let sheetList_node = this.sheetList(node);
    node.className = "condition_builder--container "+ (white === true ? "white" : "");
    node.dataset.main_sheet = sheetData._id;

    let list = document.createElement("div");
    list.className = "condition_builder--list";

    node.appendChild(list);
    let button = this.button("primary_button maxW","Add Condition", "fa-regular fa-plus", {});

    button.onclick = ()=>{
        //first we should check if a sheet was seleced
        if (sheetList_node.querySelector(".sheet_list--sheet.active"))
        {
            let target_sheet = sheetList_node.querySelector(".sheet_list--sheet.active");

            list.appendChild(this.conditionNode(sheetData, {"sheetName": target_sheet.textContent, "_id": target_sheet.dataset.id}));
        }else{
            Toastify({
                className: "toast_error",
                text: "Please select the refference sheet first!"
            }).showToast();
        }
    }

    node.appendChild(button);

    return this.container(sheetList_node, node);
}

DynamicNodes.prototype.conditionNode = function(main, target){

    if (main === undefined || target === undefined)
        return ;
    console.log(main);
    console.log(target);

    let sheetSpans = [document.createElement('span'), document.createElement('span')];

    sheetSpans[0].className = "condition_builder--sheet_span";
    sheetSpans[0].dataset.which = "main";
    sheetSpans[0].textContent = main.sheetName;

    sheetSpans[1].className = "condition_builder--sheet_span";
    sheetSpans[1].dataset.which = "target";
    sheetSpans[1].textContent = target.sheetName;
    
    let node = document.createElement("div");
    node.className = "condition_builder--condition";
    
    node.appendChild(document.createTextNode("Where column "))

    let colSelector = new column_selector(main._id);
    node.appendChild(colSelector.getNode());

    node.appendChild(document.createTextNode(" from " ))
    node.appendChild(sheetSpans[0]);

    node.appendChild(document.createTextNode(" matches "));

    colSelector = new column_selector(target._id);
    node.appendChild(colSelector.getNode());

    node.appendChild(document.createTextNode(" from "));
    node.appendChild(sheetSpans[1]);


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

DynamicNodes.prototype.searchInput = function(placeholder = "Search"){
    let template = `<label class = "search">
    <i class="fa-regular fa-search"></i>
    <input type = 'text' />
</label>`;

    let node = document.createRange().createContextualFragment(template).children[0];
    node.querySelector("input").placeholder = placeholder;
    return node;
}

DynamicNodes.prototype.title = function(content){
    let node = document.createElement("h2");
    node.textContent = content;
    node.className = "title";

    return node;
}

DynamicNodes.prototype.sheet_location = function (pageName, docName)
{
    let node = document.createDocumentFragment();
    let span_page = document.createElement("span"), span_delimiter = document.createElement("span"), span_doc = document.createElement("span");
    span_page.style = "font-weight: bold;";
    span_page.textContent = pageName;

    span_delimiter.textContent = " - ";
    
    span_doc.style = "font-weight: bold; color: var(--orange)";
    span_doc.textContent = docName;

    node.appendChild(span_page);
    node.appendChild(span_delimiter);
    node.appendChild(span_doc);

    return node;
}

DynamicNodes.prototype.sheetList =  function (condition_node)
{
    let node = document.createElement("div");
    node.className = "sheet_list--container";

    let header = document.createElement("div"), search = this.searchInput("Search sheet");
    header.className = "sheet_list--header";

    header.appendChild(this.title("My sheets"));
    header.appendChild(search);

    let body = document.createElement("div");
    body.className = "sheet_list--body";

    //ajax the sheets 
    $.ajax({
        url: "/excel/get_all_sheets",
        type: "POST",
        contentType: "application/json",
        success: (data)=>{
            console.log(data);
            if (data?.success === true)
            {
                let frag = document.createDocumentFragment();
                //start populating 
                data.data.forEach((sheet)=>{    
                    let docNode = frag.querySelectorAll(`.sheet_list--document[data-id='${sheet.document._id}']`);
                    
                    if (docNode.length == 0)
                    {
                        let docNode_header, docNode_body;
                        docNode_header = document.createElement("div");
                        docNode_header.className = "sheet_list--document_header";
                        docNode_header.appendChild(this.sheet_location(sheet.page.pageName, sheet.document.name));

                        docNode_body = document.createElement('div');
                        docNode_body.className = "sheet_list--document_body";

                        //create
                        docNode = document.createElement('div');
                        docNode.className = "sheet_list--document";
                        docNode.dataset.id = sheet.document._id;

                        docNode.appendChild(docNode_header);
                        docNode.appendChild(docNode_body);

                        frag.appendChild(docNode);
                    }else{
                        docNode = docNode[0];
                    }

                    //create the sheetNode
                    let sheetNode = document.createElement('div');
                    sheetNode.className = "sheet_list--sheet";
                    sheetNode.textContent = sheet.sheetName;
                    sheetNode.dataset.id = sheet._id;

                    docNode.querySelector(".sheet_list--document_body").appendChild(sheetNode);
                })

                body.addEventListener("click", (ev)=>{
                    if (ev.target.className == "sheet_list--sheet")
                    {
                        //ok
                        let oldNode = body.querySelector(".sheet_list--sheet.active");
                        oldNode && oldNode.classList.remove("active");

                        ev.target.classList.add("active");
                        //now we should change the conditions selectors 
                        Array.from(condition_node.querySelectorAll(".condition_builder--condition")).forEach((condition)=>{
                            let selector = condition.querySelectorAll(".column_selector")[1];
                            let span = condition.querySelector(".condition_builder--sheet_span[data-which='target']")
                            selector.dataset.sheet_id = ev.target.dataset.id;
                            span.textContent = ev.target.textContent;
                        })
                    }
                })

                body.appendChild(frag);
                search.querySelector("input").addEventListener("input",(ev)=>{
                    let input = ev.target.value;
                    let sheets = body.querySelectorAll(".sheet_list--sheet");

                    sheets.forEach((sheetNode)=>{
                        if (input.trim() != "" && !sheetNode.textContent.startsWith(input))
                        {
                            //no match 
                            sheetNode.style.display = "none";
                        }else{
                            sheetNode.style.display = "block";
                        }
                        console.log(sheetNode.parentElement.children);
                        let hasVisibleChild = Array.from(sheetNode.parentElement.children).some(child => getComputedStyle(child).display !== 'none');

                        console.log(hasVisibleChild);
                        if (!hasVisibleChild){
                            sheetNode.parentElement.classList.add("no_match");
                        }else{
                            sheetNode.parentElement.classList.remove("no_match");
                        }
                    })
                })
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Error parsing sheets!"
                }).showToast();
            }
        },error: (err)=>{
            Toastify({
                className: "toast_error",
                text: err.responseJSON?.body || "Error parsing sheets!"
            }).showToast();
        }
    })

    node.appendChild(header);
    node.appendChild(body);
    return node;
}

DynamicNodes.prototype.options_editor = function(options)
{
    let node = document.createElement("div");
    node.className = "options_editor";

    let list = document.createElement("div");
    list.className = "options_editor--list";

    let createOptionNode = (option)=>{
        let node = document.createElement("div");
        node.className = "options_editor--option";

        node.appendChild(this.input("Option name", option?.value || "Value","","",""));
        node.appendChild(this.button("cancel_button", "", "fa-regular fa-trash"));
        return node;
    }
    node.appendChild(list);
    list.appendChild(createOptionNode());

    node.appendChild(this.button("primary_button maxW", "Add condition","fa-regular fa-plus",{"margin-top": "10px"}, {
        context: undefined,
        fn: ()=>{
            list.appendChild(createOptionNode());
        },
        args: []
    }));

    return this.container(node, this.button("submit_button maxW", "Submit", "fa-regular fa-check",{"margin-top": "10px", "max-width": "400px"}));
}   