const header_cell_template = `
<div class="excel_table--header_elem">
<div class="excel_table--header_actions">

    <button class="small_action" title="Sort Ascending">
        <i class="fa-regular fa-arrow-up-z-a"></i>
    </button>         
    
    <button class="small_action" title="Sort Descending">
        <i class="fa-regular fa-arrow-down-z-a"></i>
    </button>      
    
    <button class="small_action" title="Sort Descending">
        <i class="fa-regular fa-square-xmark"></i>
    </button>    

</div>
<header_name contenteditable='true'/>
</div>`;

const cellSelectEvent = document.createEvent("HTMLEvents");
cellSelectEvent.initEvent("cellSelected", true, true);


function excel(header_info, data, elem, font_changer, formula)
{
    this.htmlParent = elem; 
    this.header = header_info;
    this.data = data;
    this.font = font_changer;
    this.formula = formula;

    this.formula.excelTable = this;

    this.selectStart = null;
    this.selectEnd = null;
    this.shiftKey = false;
}

excel.prototype.init = function()
{

    //populate header 
    this.init_header();
    this.init_body();
    this.init_listeners();

    this.autoSize();

}

excel.prototype.init_listeners = function(){

        document.querySelector(".excel_table--col_plus").addEventListener("click",()=>{
            this.addColumn();
        })

        document.addEventListener("keydown",(ev)=>{
            this.shiftKey = ev.shiftKey;
        })

        document.addEventListener("keyup",(ev)=>{
            this.shiftKey = ev.shiftKey;
        })

        document.addEventListener("fontSize_change",(ev)=>{
            if (this.selectStart != null)
            {
                let fontSize = this.font.currentFontSize;
                //we have at least one cell selected 
                //we should change the font styles to the whole selection
                this.getNodesFromSelection().forEach((colNode)=>{
                    console.log(fontSize);
                    //set the css for it 
                    colNode.style.fontSize = `${fontSize}px`;
                    this.loadNodeCellStyles({"styles":{"fontSize": fontSize}}, colNode)
                })

                this.repositionCellSelector();
            }
        })

        document.addEventListener("fontFam_change",(ev)=>{
            if (this.selectStart != null)
            {
                let fontFam = this.font.currentFont;
                //we have at least one cell selected 
                //we should change the font styles to the whole selection
                this.getNodesFromSelection().forEach((colNode)=>{
                    //set the css for it 
                    colNode.style.fontFamily = `${fontFam}`;
                    this.loadNodeCellStyles({"styles":{"fontFamily": fontFam}}, colNode)
                })

                this.repositionCellSelector();
            }
        })

        document.addEventListener("bold_change",(ev)=>{
            if (this.selectStart != null)
            {

                this.getNodesFromSelection().forEach((colNode)=>{
                    //set the css for it 
                    colNode.style.fontWeight = this.font.bold ? "bold" : "normal";
                    this.loadNodeCellStyles({"styles":{"fontWeight": this.font.bold ? "bold" : "normal"}}, colNode)
                })

                this.repositionCellSelector();
            }
        })

        document.addEventListener("italic_change",(ev)=>{
            if (this.selectStart != null)
            {

                this.getNodesFromSelection().forEach((colNode)=>{
                    //set the css for it 
                    colNode.style.fontStyle = this.font.italic ? "italic" : "normal";
                    this.loadNodeCellStyles({"styles":{"fontStyle": this.font.italic ? "italic" : "normal"}}, colNode)
                })

                this.repositionCellSelector();
            }
        })

        // AUX:  this.font.underline ? "underline" : (this.font.strike ? "line-through" : "unset");
        document.addEventListener("underline_change",(ev)=>{
            if (this.selectStart != null)
            {

                this.getNodesFromSelection().forEach((colNode)=>{
                    //set the css for it 
                    colNode.style.textDecoration = this.font.underline ? "underline" : (this.font.strike ? "line-through" : "unset");
                    this.loadNodeCellStyles({"styles":{"textDecoration": this.font.underline ? "underline" : (this.font.strike ? "line-through" : "unset")}}, colNode)
                })

                this.repositionCellSelector();
            }
        })
        // AUX IF : this.font.strike ? "line-through" : (this.font.underline ? "underline" : "unset");
        document.addEventListener("strike_change",(ev)=>{
            if (this.selectStart != null)
            {

                this.getNodesFromSelection().forEach((colNode)=>{
                    //set the css for it 
                    colNode.style.textDecoration = this.font.strike ? "line-through" : (this.font.underline ? "underline" : "unset");
                    this.loadNodeCellStyles({"styles":{"textDecoration": this.font.strike ? "line-through" : (this.font.underline ? "underline" : "unset")}}, colNode)
                })

                this.repositionCellSelector();
            }
        })
}

excel.prototype.addColumn = function(){
    let col_Object = {
        "name": "New column",
        "uuid" : "",
        "notes": window.crypto.randomUUID()
    };

    let header_parent = this.htmlParent.querySelector(".excel_table--header_items");
    this.header.push(col_Object);
    header_parent.appendChild(this.header_node(col_Object));

    //update the header columns
    header_parent.style.gridTemplateColumns += " 150px";
    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((row)=>{
        row.style.gridTemplateColumns += " 150px";
        row.appendChild(this.cellNode({
            "value": "",
            "uuid": col_Object.uuid
        }, this.header.length))
    })
}

excel.prototype.autoSize = function(){

    //foreach column we should get the maximum width of it

    let headerNodes = this.htmlParent.querySelectorAll(".excel_table--header_elem");
    let rows = this.htmlParent.querySelectorAll(".excel_table--body_row");
    let templateCols = '';
    for (_index in this.header)
    {
        let header_node_width = headerNodes[_index].clientWidth;
        rows.forEach((row)=>{
            
            if (row.children[_index] && row.children[_index].clientWidth > header_node_width && row.children[_index].clientWidth <= 300)
            {
                header_node_width = row.children[_index].clientWidth;
            }
        })

        //now get 
        templateCols += `${header_node_width}px `;
    }   

    this.htmlParent.querySelector(".excel_table--header_items").style.gridTemplateColumns = templateCols;
    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((row)=>{
        row.style.gridTemplateColumns = templateCols;
    })
}

excel.prototype.init_header = function()
{
    let frag = document.createDocumentFragment();
    
    this.header.map((header)=>{
            frag.appendChild(this.header_node(header));
    })

    this.htmlParent.querySelector(".excel_table--header_items").appendChild(frag);
}

excel.prototype.header_node = function (header_object)
{
    let temp = document.createRange().createContextualFragment(header_cell_template);
    temp.querySelector("div").dataset.uuid = header_object.uuid;
    temp.querySelector("header_name").textContent = header_object.name;

    return temp;
}

excel.prototype.init_body = function(){
    let frag = document.createDocumentFragment();
    
    this.data.map((data_Object, _index)=>{
        frag.appendChild(this.dataRow_node(data_Object, _index + 1));    
    })

    this.htmlParent.querySelector(".excel_table--body").appendChild(frag);
}

excel.prototype.dataRow_node = function(data_Object, _index)
{
    let row = document.createElement("div"), frag = document.createDocumentFragment(), cell;
    row.className = "excel_table--body_row";    
    row.dataset.rowNum = _index;
    row.dataset.uuid = data_Object.rowID;
    // we need to show the data in the header order
    this.header.forEach((header_elem)=>{
        let uuid = header_elem.uuid;    
        //now search for this uuid and then add the node 
        data_Object.data.forEach((col_Object, _index)=>{
            if (col_Object.uuid == uuid)
            {               
                frag.appendChild(this.cellNode(col_Object, _index));
            }   
        })
    })

    row.appendChild(frag);

    return row;
}

excel.prototype.selectCellText = function(cell){

    let selection = document.getSelection();
    if (selection.toString() === "")
    {
        selection.selectAllChildren(cell);
    }

    return selection;
}

excel.prototype.cellNode = function (col_Object, _index)
{
    let cell = document.createElement("div");
    cell.className = "excel_table--body_cell";
    cell.contentEditable = true;
    cell.textContent = col_Object.value;
    cell.dataset.cellIndex = _index;
    cell.dataset.colUuid = col_Object.uuid;

    this.loadNodeCellStyles(col_Object, cell);

    cell.onfocus = (ev)=>{
        this.select_cell(col_Object, cell, ev);
    }

    cell.oncopy = (ev)=>{
        if (ev.target.dataset.formula)
        {
            ev.clipboardData.setData("text/plain", JSON.stringify({"content": ev.target.dataset.formula, "isFormula": true}));
        }else{
            let selection = this.selectCellText(cell);
            ev.clipboardData.setData("text/plain", JSON.stringify({"content": selection.toString(), "isFormula": false}));
        }

        ev.preventDefault();
    }

    cell.onpaste = (ev)=>{
        let obj = JSON.parse((ev.originalEvent || ev).clipboardData.getData('text/plain'));

        if (obj.isFormula)
        {
            this.formula.copiedFormula(obj.content, cell)
        }else{
            const selection = document.getSelection();
            if (!selection.rangeCount) return false;
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(obj.content));
        }

        ev.preventDefault();
    }

    return cell;
}

excel.prototype.loadNodeCellStyles = function (col_Object, node){
    console.log(col_Object);
    if (col_Object.styles)
    {
        Object.keys(col_Object.styles).forEach((key)=>{
            if (key !== "fontSize")
                node.style[key] = col_Object.styles[key];
            else{
                node.style[key] = `${col_Object.styles[key]}px`;
            }
            node.dataset[`styles__${key}`] = col_Object.styles[key];
        })
    }
}

excel.prototype.select_cell = function (col_Object, node, event)
{
    
    if (!this.formula.nodeSelector){
        this.selectEnd = node;
        if (!this.shiftKey)
        {
            this.selectStart = node;
            this.font.loadStyles(this.buildStylesObject(node));
        }

        //position the cellSelector
        this.positionCellSelector(this.calculateSelectWidth(), this.calculateSelectHeight());
    }
    else{
        event.preventDefault();
    }

    let ev = new CustomEvent("cellSelected",{
        detail: {
            value: `$${node.parentNode.dataset.rowNum}@${this.getColNameByUuid(node.dataset.colUuid)}`
        }
    });
    document.dispatchEvent(ev);
}

excel.prototype.buildStylesObject = function(node)
{
    let styles = {};

    Object.keys(node.dataset).map((name)=>{
        if (name.indexOf("styles__") !== -1)
        {
            styles[name.replace("styles__","")] = node.dataset[name];
        }
    })

    return styles;
}

excel.prototype.repositionCellSelector = function(){
    this.positionCellSelector(this.calculateSelectWidth(), this.calculateSelectHeight());
}

excel.prototype.positionCellSelector = function(width, height)
{
    let cellSelector = document.querySelector(".cell_selector")

    cellSelector.style.left = `${this.selectStart.offsetLeft}px`;
    cellSelector.style.top = `${this.selectStart.parentNode.offsetTop}px`;

    cellSelector.style.width = `${width + parseInt(this.selectEnd.dataset.cellIndex) - parseInt(this.selectStart.dataset.cellIndex) + 1}px`;
    cellSelector.style.height = `${height + parseInt(this.selectEnd.parentNode.dataset.rowNum) - parseInt(this.selectStart.parentNode.dataset.rowNum) + 1}px`;

}

excel.prototype.calculateSelectWidth = function()
{
    let indexStart = this.selectStart.dataset.cellIndex, indexEnd = this.selectEnd.dataset.cellIndex,width = 0;

    //calculate the widths 
    for (let indexCell = indexStart; indexCell <= indexEnd; indexCell++)
    {
        width += document.querySelector(`.excel_table--body_cell[data-cell-index='${indexCell}']`).clientWidth;
    }

    return width;
}

excel.prototype.calculateSelectHeight = function()
{
    let startRowIndex = this.selectStart.parentNode.dataset.rowNum, endRowIndex = this.selectEnd.parentNode.dataset.rowNum, height = 0;

    for (let indexRow = startRowIndex; indexRow <= endRowIndex; indexRow++)
    {
        height += document.querySelector(`.excel_table--body_row[data-row-num='${indexRow}']`).clientHeight;
    }

    return height;
}

excel.prototype.getNodesFromSelection = function()
{
    let nodes = [];

    //get columnStartIndex and columnEndIndex
    let colStartIndex = this.selectStart.dataset.cellIndex, colEndIndex = this.selectEnd.dataset.cellIndex;
    //now get the rows 
    let startRowIndex = this.selectStart.parentNode.dataset.rowNum, endRowIndex = this.selectEnd.parentNode.dataset.rowNum, height = 0;

    //now build the selection 
    for (let indexRow = startRowIndex; indexRow <= endRowIndex; indexRow++)
    {
        for (let indexCell = colStartIndex; indexCell <= colEndIndex; indexCell++)
        {
            let node = document.querySelector(`.excel_table--body_row[data-row-num='${indexRow}'] .excel_table--body_cell[data-cell-index='${indexCell}']`);
            nodes.push(node);
        }
    }

    return nodes;
}

excel.prototype.getColNameByUuid = function(uuid)
{
    for (let index = 0;index<=this.header.length;index++)
    {
        if (this.header[index].uuid === uuid)
        {
            return this.header[index].name.replaceAll(" ","");
        }
    }
}

excel.prototype.getCellIndexByHeaderName = function (headerName)
{
    for (let index = 0;index < this.header.length;index++)
    {
        if (this.header[index].name.replaceAll(" ","") == headerName)
        {
            return index;
        }
    }

    return -1;
}

excel.prototype.getCellValueByCoords = function(cellCoords){
    let rowNum = cellCoords.split("@")[0].slice(1,), cellIndex = this.getCellIndexByHeaderName(cellCoords.split("@")[1]);
    let cellNode = document.querySelector(`.excel_table--body_row[data-row-num='${rowNum}']`).querySelector(`.excel_table--body_cell[data-cell-index='${cellIndex}']`);

    return cellNode.innerText;
}