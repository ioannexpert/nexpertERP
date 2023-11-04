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
<header_name contenteditable='true'></header_name>

<!-- 
        <div class="custom_select">
        <customOption>
            <i class="fa-regular fa-text"></i>
            String
        </customOption>

        <customOption>
            <i class="fa-regular fa-calendar"></i>
            Date
        </customOption>
        </div>
 -->
</div>`;

const sheet_template = `<div class="excel_sheet">
    <span></span>
    <i class="fa-regular fa-ellipsis-vertical"></i>
</div>`;

const cellSelectEvent = document.createEvent("HTMLEvents");
cellSelectEvent.initEvent("cellSelected", true, true);


function excel(elem, font_changer, formula)
{
    this.htmlParent = elem; 
    this.header = [];
    this.data = {};
    this.sheets = [];
    
    this.changesCoords = [];

    this.active_sheetIndex = -1;
    this.font = font_changer;
    this.formula = formula;

    this.rowCount = {};

    this.formula.excelTable = this;

    this.selectStart = null;
    this.selectEnd = null;
    this.shiftKey = false;
}

excel.prototype.init = function()
{
    this.parseSheets();

    //populate header 
    //this.init_header();
    //this.init_body();
    //run formula from columns
    //this.renderFormulas();
    this.init_listeners();

}

excel.prototype.parseSheets = function(){
    $.ajax({
        url: "/excel/get_sheets",
        type: "GET",
        contentType: "application/json",
        success: (sheets)=>{
            if (sheets.length != 0)
            {
                this.load_sheets(sheets, false);
            }
        },error: function(){
            alert("Eroare la parsare sheets!");
        }
    })
}

excel.prototype.clearSheets = function(){
    Array.from(document.querySelector(".excel_sheets").querySelectorAll("*")).forEach((elem)=>{
        elem.remove();
    })
}

excel.prototype.load_sheets = function(sheets, append = true){

    !append && this.clearSheets;

    let frag = document.createDocumentFragment();

    sheets.forEach((sheet)=>{

        let node = this.sheetNode(sheet);

        sheet.node = node.children[0];
        this.sheets.push(sheet);

        frag.appendChild(node);
    })

    document.querySelector(".excel_sheets").appendChild(frag);
    
    !append && this.selectSheet(0);
}

excel.prototype.selectSheet = function(index){
    
    this.clear_data();
    this.active_sheetIndex = index;
    document.querySelector(".excel_sheet.active")?.classList.remove("active");
    this.sheets[index].node.classList.add("active");
    this.parseHeader();

}

excel.prototype.sheetNode = function(sheetData)
{
    let temp = document.createRange().createContextualFragment(sheet_template);
    temp.children[0].dataset.id = sheetData._id;
    temp.querySelector("span").textContent = sheetData.sheetName;

    let currentIndex = this.sheets.length;

    temp.children[0].onclick = ()=>{
        this.selectSheet(currentIndex);
    }

    return temp;
}

excel.prototype.addSheet = function (sheetName){
    $.ajax({
        url: "/excel/add_sheet",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({sheetName}),
        success: (data)=>{
            //the id is returned 
            if (data.id)
            {   
                //add the sheet now 
                this.load_sheets([{sheetName, "_id": data.id, "notes": ""}], true);
            }
        },error: function(){
            alert("eroare de server");
        }
    })
}

excel.prototype.init_listeners = function(){

    document.querySelector(".excel_sheets--container .fa-plus").addEventListener("click",(ev)=>{
        document.querySelector(".excel_sheets--menu").style.top = `${ev.target.offsetTop + ev.target.clientHeight + 5}px`;
        document.querySelector(".excel_sheets--menu").classList.toggle("active");
    })

    document.querySelector(".excel_sheets--menu #add_sheet").addEventListener("click",()=>{
        let sheetName = document.querySelector(".excel_sheets--menu input").value;

        if (sheetName.trim() != "")
        {
            document.querySelector(".excel_sheets--menu").classList.remove("active");
            //send the request 
            this.addSheet(sheetName);
        }
        else{
            alert("Please input a sheet name");
        }
    })


    document.querySelector(".excel_table--col_plus").addEventListener("click",(ev)=>{
            if (ev.target == document.querySelector(".excel_table--col_plus"))
            document.querySelector(".excel_table--col_plus").classList.toggle("on");
        })

        document.querySelector(".excel_table--col_plus .excel_table--add_col_menu #add_col").addEventListener("click",()=>{
            if (customSelect !== undefined)
            {
                let colType = customSelect.getPickedOption(document.querySelector(".excel_table--col_plus .excel_table--add_col_menu .custom_select"));
                let colName = document.querySelector(".excel_table--col_plus .excel_table--add_col_menu #col_name").value || "New field";
                
                if (colType != null && colName.trim().length != 0)
                {
                    this.addColumn(colName, colType);
                    document.querySelector(".excel_table--col_plus").classList.remove("on");
                }
            }
        })

        document.querySelector(".excel_add_row .excel_table--col_plus").addEventListener("click",()=>{
            this.addRow();
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

excel.prototype.increaseRows = function(){
    if (this.rowCount[this.getActiveSheet()])
    {
        this.rowCount[this.getActiveSheet()]++;
    }else{
        this.rowCount[this.getActiveSheet()] = 1;
    }
}

excel.prototype.getRowCount = function(){
    if (this.rowCount[this.getActiveSheet()])
    {
        return this.rowCount[this.getActiveSheet()];
    }else{
        return 0;
    }
}

excel.prototype.addRow = function(test = false){
    //create a fakeRow object 
    let fakeRow = {};
    fakeRow.rowID = 0;
    this.increaseRows();

    //set the grid
    let rowNode = this.dataRow_node(fakeRow, this.getRowCount());
    rowNode.style.gridTemplateColumns = this.htmlParent.querySelector(".excel_table--header").querySelector(".excel_table--header_items").style.gridTemplateColumns;

    if (test)
    return rowNode;

    this.htmlParent.querySelector(".excel_table--body").appendChild(rowNode);
}

excel.prototype.addColumn = function(colName, colType){



    let col_Object = {
        "name": colName,
        "colType": colType,
        "notes": ""
    };

    $.ajax({
        url: "/excel/add_column",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({...col_Object, sheetId: this.getActiveSheet()}),
        success: (data)=>{
            if (data.uuid){
                col_Object.uuid = data.uuid;

                let header_parent = this.htmlParent.querySelector(".excel_table--header_items");
                this.header[this.getActiveSheet()].push(col_Object);
                header_parent.appendChild(this.header_node(col_Object));
                
                //update the header columns
                header_parent.style.gridTemplateColumns += " 150px";

                Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((row)=>{
                    row.style.gridTemplateColumns += " 150px";
                    row.appendChild(this.cellNode({
                        "value": "",
                        "uuid": col_Object.uuid
                    }, this.header[this.getActiveSheet()].length))
                })
            }else{
                alert("Something happened!");
            }
        },error: function(){
            alert("Add column error!");
        }
    })

}

excel.prototype.getActiveSheet = function(){
    return this.sheets[this.active_sheetIndex]._id;
}

excel.prototype.autoSize = function(){

    //foreach column we should get the maximum width of it

    let headerNodes = this.htmlParent.querySelectorAll(".excel_table--header_elem");
    let rows = this.htmlParent.querySelectorAll(".excel_table--body_row");
    let templateCols = '';
    for (_index in this.header[this.getActiveSheet()])
    {
        let header_node_width = headerNodes[_index].clientWidth < 150 ? 150 : headerNodes[_index].clientWidth;

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

excel.prototype.parseHeader = function(){
    if (this.header[this.getActiveSheet()])
    {
        this.clear_header();
        this.load_header();
        this.autoSize();
        this.parseData();

    }else
    $.ajax({
        url: "/excel/get_header",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify({"sheetId": this.sheets[this.active_sheetIndex]._id}),
        success: (data)=>{
            this.header[this.getActiveSheet()] = data;
            this.clear_header();
            this.load_header();
            this.autoSize();
            this.parseData();
        },error: function(err){
            alert("header parse error!");
        }
    })
}

excel.prototype.appendData = function(data){
    
    data.forEach((cell)=>{
        //check if sheetId exists 
        if (this.data[cell.sheetId] === undefined){
            this.data[cell.sheetId] = {};
        }
        //check if this rowId exists 
        if (this.data[cell.sheetId][cell.rowId] === undefined){
            this.data[cell.sheetId][cell.rowId] = {};
        }
        this.data[cell.sheetId][cell.rowId][cell.uuid] = {
            "formula": cell.formula || "",
            "styles": cell.styles || {},
            "value": cell.value || ""
        }
    })
}

excel.prototype.parseData = function(){
    $.ajax({
        url: "/excel/parse_rows",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"sheetId": this.getActiveSheet()}),
        success: (data)=>{
        
            this.appendData(data);
            this.load_cells();
        
        },error: function(){
            alert("eroare la parsare");
        }
    })
}

excel.prototype.clear_header = function(){
    Array.from(this.htmlParent.querySelectorAll(".excel_table--header_elem")).forEach((elem)=>{
        elem.remove();
    })
}

excel.prototype.load_header = function()
{
    let frag = document.createDocumentFragment();
    
    this.header[this.getActiveSheet()].map((header)=>{
            frag.appendChild(this.header_node(header));
    })

    this.htmlParent.querySelector(".excel_table--header_items").appendChild(frag);
}

excel.prototype.header_node = function (header_object)
{
    let temp = document.createRange().createContextualFragment(header_cell_template);
    temp.querySelector("div").dataset.uuid = header_object.uuid;
    temp.querySelector("header_name").textContent = header_object.name;
    
    //TODO
    //customSelect.init(temp.querySelector(".custom_select"));
    return temp;
}

excel.prototype.clear_data = function (){
    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((el)=>el.remove());
}

excel.prototype.load_cells = function(){
    let frag = document.createDocumentFragment();
    
    Object.keys(this.data[this.getActiveSheet()]).forEach((rowId)=>{
        frag.appendChild(this.dataRow_node(this.data[this.getActiveSheet()][rowId], rowId));
    })

    this.htmlParent.querySelector(".excel_table--body").appendChild(frag);
    this.autoSize();
}

excel.prototype.dataRow_node = function(data_Object, _index)
{
    this.increaseRows();

    let row = document.createElement("div"), frag = document.createDocumentFragment(), rowDetails = document.createElement("div");
    row.className = "excel_table--body_row ";    
    row.dataset.rowNum = _index;
    row.dataset.uuid = _index;

    rowDetails.className = "excel_table--body_row_data";
    rowDetails.textContent = _index;

    rowDetails.onclick = ()=>{
        row.classList.toggle("selected");
    }

    row.appendChild(rowDetails);

    row.appendChild(this.populateRow(data_Object));

    return row;
}

excel.prototype.populateRow = function(rowData){
    let frag = document.createDocumentFragment();
    
    //first we append the cols we have in the rowData Object in the header order !! 
    this.header[this.getActiveSheet()].forEach((header_elem, _index)=>{
        //check if we have it
        if (rowData[header_elem.uuid]){
            console.log(rowData);
            frag.appendChild(this.cellNode({...rowData[header_elem.uuid], uuid: header_elem.uuid}, _index));
        }else{
            //no data, append blank 
            frag.appendChild(this.cellNode({"uuid": header_elem.uuid}, _index));
        }
    });

    return frag;
}

excel.prototype.selectCellText = function(cell){

    let selection = document.getSelection();
    if (selection.toString() === "")
    {
        selection.selectAllChildren(cell);
    }

    return selection;
}

excel.prototype.cell_changed = function(rowId, headerId){
    let cellCoords = `${rowId}@${headerId}`;

    if (this.changesCoords[this.getActiveSheet()])
    {
        if (this.changesCoords[this.getActiveSheet()].indexOf(cellCoords) == -1)
        {
            this.changesCoords[this.getActiveSheet()].push(cellCoords);
        }
    }else{
        this.changesCoords[this.getActiveSheet()] = [cellCoords];
    }
}

excel.prototype.save_current_sheet = function(){
    let body = {
        "sheetId": this.getActiveSheet(),
        data: {}
    };
    let data = {};

    this.changesCoords[this.getActiveSheet()]?.forEach((cellCoords)=>{
        let node = this.getNodeByCoords(cellCoords);
        if (node != null)
            data[cellCoords] = {
                "styles": this.buildStylesObject(node),
                "value": node.innerText,
                "formula": node.dataset.formula
            };  
    });
    body.data = data;

    //make the request
    if (Object.keys(data).length != 0)
    $.ajax({
        url: "/excel/saveSheet",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(body),
        success: ()=>{
            alert("Salvat cu bine!");
        },error: ()=>{
            alert("Nu s-a salvat :(");
        }
    })
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

    cell.onkeydown = (ev)=>{
        this.cell_changed(cell.parentElement.dataset.rowNum, col_Object.uuid);
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

excel.prototype.getNodeByCoords = function(cellCoords){
    let rowId = cellCoords.split("@")[0], uuid = cellCoords.split("@")[1];
    return this.htmlParent.querySelector(`.excel_table--body_row[data-row-num='${rowId}']`)?.querySelector(`.excel_table--body_cell[data-col-uuid='${uuid}']`) || null;
}

excel.prototype.getColNameByUuid = function(uuid)
{
    for (let index = 0;index<=this.header[this.getActiveSheet()].length;index++)
    {
        if (this.header[this.getActiveSheet()][index].uuid === uuid)
        {
            return this.header[this.getActiveSheet()][index].name.replaceAll(" ","");
        }
    }
}

excel.prototype.getCellIndexByHeaderName = function (headerName)
{
    for (let index = 0;index < this.header[this.getActiveSheet()].length;index++)
    {
        if (this.header[this.getActiveSheet()][index].name.replaceAll(" ","") == headerName)
        {
            return index;
        }
    }

    return -1;
}

excel.prototype.validCellCoords = function(cellCoords)
{
    return /^\$[0-9]*\@[a-zA-Z]*$/.test(cellCoords);
}

excel.prototype.getCellValueByCoords = function(cellCoords){
    if (!this.validCellCoords(cellCoords))
        return cellCoords;

    let rowNum = cellCoords.split("@")[0].slice(1,), cellIndex = this.getCellIndexByHeaderName(cellCoords.split("@")[1]);
    let cellNode = document.querySelector(`.excel_table--body_row[data-row-num='${rowNum}']`)?.querySelector(`.excel_table--body_cell[data-cell-index='${cellIndex}']`);

    return cellNode?.innerText || null;
}

excel.prototype.renderFormulas = function(){
    this.header[this.getActiveSheet()].forEach((column)=>{
        if (column.formula && column.formula != "")
        {
            //get each cell that has this colUuid
            this.getCellsForUuid(column.uuid).forEach((node)=>{
                node.innerText = this.formula.runFormula(this.formula.compileGeneralizedFormula(column.formula, node.parentNode.dataset.rowNum));
            })
        }
    })
}

excel.prototype.getCellsForUuid = function(uuid)
{
    return Array.from(this.htmlParent.querySelectorAll(`.excel_table--body_cell[data-col-uuid='${uuid}']`));
}