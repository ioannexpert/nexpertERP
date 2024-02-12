const template = `
<div class="column_selector">
<div class="column_selector--header">
    <input type = 'text' placeholder="Select column" />
    <i class="fa-regular fa-chevron-down"></i>
</div>

<div class="column_selector--container">
    <div class="column_selector--list">
        
    </div>
</div>
</div>
`;

function column_selector(sheetId = undefined){
    this.node = undefined;
    this.selectedId = undefined;

    this.initNode(sheetId);
    this.parseSheets(sheetId);
}

column_selector.prototype.parseSheets = function(sheetId){
    $.ajax({
        url: "/excel/get_all_headers",
        type: "POST",
        data: JSON.stringify({"sheetId": sheetId === undefined ? "" : sheetId}),
        contentType: "application/json",
        success: (data)=>{
            this.clearData();
            this.populateData(data);
        },error: ()=>{
            
        }
    })
}

column_selector.prototype.clearData = function(){
    Array.from(this.node.querySelector(".column_selector--list").children).forEach((node)=>node.remove());
}

column_selector.prototype.populateData = function (data){
    let groups = {};

    data.forEach((header)=>{
        if (!groups[header.sheetName])
        {
            //init 
            groups[header.sheetName] = this.initGroup(header.sheetName);
        }
        groups[header.sheetName].appendChild(this.initItem(header));
    })

    Object.keys(groups).forEach((group)=>{
        this.node.querySelector(".column_selector--list").appendChild(groups[group]);
    })
}

column_selector.prototype.initGroup = function (name)
{
    let parent = document.createElement("div"), span = document.createElement('span');
    span.textContent = name;
    parent.className = "column_selector--group";
    
    parent.appendChild(span);

    return parent;
}

column_selector.prototype.initItem = function(row)
{
    let item = document.createElement("div"), span = document.createElement("span");
    span.className = "column_selector--sheet";
    span.textContent = row.sheetName+ ' ';

    item.className = "column_selector--item";
    item.appendChild(span);
    item.appendChild(document.createTextNode(row.name));
    item.dataset.id = row._id;

    item.onclick = ()=>{
        this.selectedId = row._id;
        this.node.dataset.selectedId = row._id;
        this.node.querySelector(".column_selector--header input").value = `${row.sheetName}!${row.name}`;
        this.node.classList.remove("open");
    }

    return item;
}

column_selector.prototype.getNode = function(){
    return this.node;
}

column_selector.prototype.initNode = function(sheetId){
    this.node = document.createRange().createContextualFragment(template).children[0];
    this.node.dataset.sheet_id = sheetId;
    this.node.querySelector(".column_selector--header input").onkeyup = ()=>{
        this.input();
    };
    this.node.querySelector(".column_selector--header").onclick = (ev)=>{
        this.node.classList.toggle("open");
        this.node.querySelector(".column_selector--header input").focus();
    }

    const config = { attributes: true, attributeFilter: ['data-sheet_id'] };

    // Callback function to execute when a mutation is observed
    const callback = (mutationsList, observer)=> {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-sheet_id') {
        console.log('data-sheet_id has changed:', mutation.target.dataset.sheet_id);
        // Perform actions or handle the change here
        this.parseSheets(mutation.target.dataset.sheet_id);
        }
    });
    };

    // Create a MutationObserver instance with the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for specified mutations
    observer.observe(this.node, config);


    document.addEventListener("click", (ev)=>{
        if (!this.node.contains(ev.target))
        {
            this.node.classList.remove("open");
        }
    });
}

column_selector.prototype.input = function(){
    //start searching in the item list 
    let items = this.node.querySelectorAll(".column_selector--item");
    let input_value = this.node.querySelector(".column_selector--header input").value;

    Array.from(items).forEach((item)=>{
        let content = item.textContent;
        console.log(content);

        if (content.includes(input_value.trim()))
        {
            item.classList.remove("hidden");
        }else{
            item.classList.add("hidden");
        }
    })
}

