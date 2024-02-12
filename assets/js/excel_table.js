const header_cell_template = `
<div class="excel_table--header_elem">
<div class="excel_table--header_actions">

    <button class="small_action" title="Sort Ascending">
        <i class="fa-regular fa-arrow-up-z-a"></i>
    </button>         
    
    <button class="small_action" title="Sort Descending">
        <i class="fa-regular fa-arrow-down-z-a"></i>
    </button>      
    
    <button class="small_action" title="Delete cell">
        <i class="fa-regular fa-square-xmark"></i>
    </button>    
    <button class="small_action" title="Select cell">
        <i class="fa-classic fa-square-check"></i>
    </button>   

    <button class="small_action" title="Notes">
        <i class="fa-classic fa-notes"></i>
    </button>  

    <button class="small_action" title="Edit cell">
        <i class="fa-classic fa-edit"></i>
    </button>  

</div>

<div class = 'excel_table--header_drag'></div>
<header_name></header_name>
</div>`;

const sheet_template = `<div class="excel_sheet">
    <span></span>
    <i class="fa-regular fa-ellipsis-vertical"></i>
</div>`;

const cellSelectEvent = document.createEvent("HTMLEvents");
cellSelectEvent.initEvent("cellSelected", true, true);


function excel(elem, font_changer, formula, sheet = undefined, row = undefined)
{
    this.resize_timeout = null;
    this.resize_header = null;
    this.resize_offset = 0;
    this.resize_init = 0;
    //hyperlink related 
    this.rowToSelect = row || -1;
    this.sheetToSelect = sheet || "";

    this.htmlParent = elem; 
    this.header = [];
    this.data = {};
    this.sheets = [];
    
    this.changesCoords = [];
    this.pendingCells = [];

    this.active_sheetIndex = -1;
    this.font = font_changer;
    this.formula = formula;

    this.rowCount = {};

    this.formula.excelTable = this;

    this.selectStart = null;
    this.selectEnd = null;
    this.shiftKey = false;
    this.ctrlKey = false;
}

excel.prototype.init = function()
{
    this.parseSheets();

    //populate header 
    //this.init_header();
    //this.init_body();
    //run formula from columns
    //this.renderFormulas();
    this.calculateSize();
    this.init_listeners();
}

excel.prototype.calculateSize = function(){
        //calculate excel_table hwight 
        let table_rect = this.htmlParent.getBoundingClientRect();

        this.htmlParent.style.height = `${document.body.clientHeight - table_rect.y}px`

        let sheets_container = this.htmlParent.querySelector(".excel_sheets--container");
        sheets_container.style.top = `${table_rect.y + this.htmlParent.clientHeight - sheets_container.clientHeight}px`;
        sheets_container.style.left = `${table_rect.x + 72}px`;
        sheets_container.style.width = `${this.htmlParent.clientWidth - 70 - 7}px`;
}

excel.prototype.BodyhasScroll = function(){
    return this.htmlParent.querySelector(".excel_table--body").scrollWidth > this.htmlParent.clientWidth;
}

excel.prototype.addInitRows = function(){
    let row_count = this.rowCount[this.getActiveSheet()];
    for (let i = 1;i<=30 - row_count;i++)
    {
        this.addRow(true);
    }
}

excel.prototype.parseSheets = function(){
    $.ajax({
        url: "/excel/get_sheets",
        type: "POST",
        data: JSON.stringify({"doc_id": document.querySelector("#doc_id").value}),
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
    !append && this.clearSheets();
    console.log(sheets);
    console.log(append);

    let indexSheet = 0; 
    console.log(this.sheetToSelect);
    let frag = document.createDocumentFragment();

    sheets.forEach((sheet, _index)=>{
        if (sheet.sheetName == this.sheetToSelect)
        indexSheet = _index;
        let node = this.sheetNode(sheet);

        sheet.node = node.children[0];
        this.sheets.push(sheet);

        frag.appendChild(node);
    })

    document.querySelector(".excel_sheets").appendChild(frag);
    
    !append && this.selectSheet(indexSheet);
}

excel.prototype.selectSheet = function(index){
    
    this.resetCellSelector();
    this.clear_data();
    this.active_sheetIndex = index;
    document.querySelector(".excel_sheet.active")?.classList.remove("active");
    this.sheets[index].node.classList.add("active");
    this.parseHeader();

}

excel.prototype.sheetNode = function(sheetData)
{
    let temp = document.createRange().createContextualFragment(sheet_template);
    let parent = temp.children[0];

    parent.dataset.id = sheetData._id;
    temp.querySelector("span").textContent = sheetData.sheetName;

    let currentIndex = this.sheets.length;

    parent.onclick = ()=>{
        this.selectSheet(currentIndex);
    }

    temp.querySelector(".excel_sheet i").onclick = (ev)=>{
        ev.stopPropagation();
        let sheet = ev.target.parentElement;
        
        this.openSheetContextMenu(sheet.offsetLeft - sheet.parentElement.scrollLeft, sheet.offsetWidth);
        this.setSheetMenuItems(parent);
    }

    return temp;
}

excel.prototype.setSheetMenuItems = function (node)
{
    document.querySelector(".excel_sheet--menu .excel--context_item[data-for='rename']").onclick = ()=>{
        
        let input_node = new DynamicNodes().input("Sheet name","Sheet Name",node.querySelector("span").innerText.trim(),"new_sheet_name");

        let cb_submit = {
            context_submit: this,
            fn: this.changeSheetName,
            params: [node, input_node]
        };
        let p = document.createElement("p");
        p.innerHTML = `You are now changing the sheet name of <b>${node.querySelector("span").innerText.trim()}</b>`;

        new Confirm("Change sheet name",[p, input_node], {}, cb_submit);
    }

    document.querySelector(".excel_sheet--menu .excel--context_item[data-for='delete']").onclick = ()=>{
        
        let cb_submit = {
            context_submit: this,
            fn: this.deleteSheet,
            params: [node]
        };
        new Confirm("Delete sheet",document.createTextNode("Are you sure you want to delete this sheet?"), {}, cb_submit);
    }
}

excel.prototype.deleteSheet = function(node, confirmWindow = null)
{
    confirmWindow != null && confirmWindow.open();
    $.ajax({
        url: "/excel/removeSheet",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"sheetId": node.dataset?.id || ""}),
        success: ()=>{
            delete this.data[node.dataset.id];
            this.selectSheet(0);
            node.remove();
            Toastify({
                text: "Sheet deleted!",
                className: "toast_sucess",
            }).showToast();
        },error: ()=>{
            Toastify({
                text: "Sheet not deleted!",
                className: "toast_error",
            }).showToast();
        }
    })
}

excel.prototype.changeSheetName = function(node, input_node, confirmNode = null){
   
    //do the query 
    $.ajax({
        url: "/excel/changeSheetName",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"sheetId": node.dataset?.id || "", "name": input_node.querySelector("input").value}),
        success: ()=>{
            //change sheet name 
            node.querySelector("span").textContent = input_node.querySelector("input").value;
            confirmNode !== null && confirmNode.open();
            Toastify({
                text: "Sheet name changed!",
                className: "toast_sucess",
            }).showToast();

        },error: ()=>{
            //TODO ERROR
            Toastify({
                text: "Sheet name not changed!",
                className: "toast_error",
            }).showToast();
        }
    })
}

excel.prototype.openSheetContextMenu = function(left, width){
    document.querySelector(".excel_sheet--menu").style.left = `${left}px`;
    document.querySelector(".excel_sheet--menu").style.width = `${width - 10}px`;
    document.querySelector(".excel_sheet--menu").classList.add("open");
}

excel.prototype.addSheet = function (sheetName){
    $.ajax({
        url: "/excel/add_sheet",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({sheetName, "doc_id": document.querySelector("#doc_id").value}),
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
    
    let rO = new ResizeObserver(entries => {
            if (this.resize_timeout !== null)
            {
                clearTimeout(this.resize_timeout);
            }
    
            this.resize_timeout = setTimeout(()=>{
                this.calculateSize();
            },300);
      });

    rO.observe(document.querySelector(".page_content"));

    document.addEventListener("mousemove",(ev)=>{
        if (this.resize_header !== null){
            let difference = ev.offsetX - this.resize_offset;

            let index = Array.from(this.resize_header.parentNode.children).indexOf(this.resize_header);

            let templateCols = this.htmlParent.querySelector(".excel_table--header_items").style.gridTemplateColumns;
            let splits = templateCols.split(" ");
            
            let target = parseInt(splits[index]) + difference;

            this.htmlParent.querySelector(".excel_table--header_items").style.gridTemplateColumns = `${splits.slice(0, index).join(" ")} ${target}px ${splits.slice(index+1,).join(" ")}`;
        }
    })
      
    document.addEventListener("dateFormat_change",(ev)=>{
        let value = ev.detail.value;

        if (value)
        {
            this.getNodesFromSelection().forEach((cellNode)=>{
                if (cellNode.dataset.type == "date"){
                    let cellCoords = this.cellNode_toCoords(cellNode);

                    console.log(this.data[this.getActiveSheet()][cellCoords[0]][cellNode.dataset.colUuid]);

                    if (this.data[this.getActiveSheet()][cellCoords[0]][cellNode.dataset.colUuid] !== undefined)
                    {
                        if (this.data[this.getActiveSheet()][cellCoords[0]][cellNode.dataset.colUuid].typeParams === undefined)
                        {
                            this.data[this.getActiveSheet()][cellCoords[0]][cellNode.dataset.colUuid].typeParams = {};
                        }

                        this.data[this.getActiveSheet()][cellCoords[0]][cellNode.dataset.colUuid].typeParams.format = value;
                    }
                    cellNode.dataset.format = value;
                    this.setCellValue(cellNode, "", null);

                }
            })
        }
    })

    document.addEventListener("cellType_change",(ev)=>{

        let nodes = this.getNodesFromSelection();
        let type = ev.detail.value;
        let prev_type = ev.detail.prev_type;
        let ok = true;
        //check if type is valid 
        nodes.forEach((node)=>{
            if (!this.font.checkCellType(type, node))
            {
                ok = false;
            }   
        })

        if (!ok)
        {
            //show the confirmation 
            let cb_submit = {
                context_submit: this,
                fn: this.setCellType,
                params: [type]
            };
            let cb_cancel = {
                context_cancel: customSelect,
                fn: customSelect.selectOption,
                params: [document.querySelector("#content_type"), prev_type, false]
            }
            new Confirm("Type is not valid!",document.createTextNode("Some of the selected cells are not compatible with this type. Would you like to continue?"), cb_cancel, cb_submit);
        }
        else{
            this.setCellType(type, null);
        }
    })

    //Stylig navigation

    document.querySelector(".excel_menu--categories").addEventListener("click", (ev)=>{
        if (ev.target.className.startsWith("excel_menu--category"))
        {
          document.querySelector(".excel_menu--category.active")?.classList.remove("active");
          ev.target.classList.add("active");
          //ok
          let index = Array.from(document.querySelector(".excel_menu--categories").children).indexOf(ev.target);
          //hide all 
          Array.from(document.querySelector(".excel_menu--containers").children).forEach((node, _index)=>{
            if (_index != index)
            {
                //hide
                node.classList.add("hidden");
            }else{
                node.classList.remove("hidden")
            }
          })
        }
      })


    document.querySelector("#import_excel").addEventListener("click",()=>{
        if (modalLib !== undefined)
        {
            if (window.dn === undefined)
            {
                window.dn = new DynamicNodes();
            }

            modalLib.setView(window.dn.frag(window.dn.file_upload_import([], {sheetId: this.getActiveSheet(), docId: document.querySelector("#doc_id").value, context: this})), "Import excel file");
            modalLib.open();
        }   
    })


    document.querySelector("#save").addEventListener("click",()=>{
        this.save_current_sheet();
    })

    document.querySelector(".excel_sheets--container .fa-plus").addEventListener("click",(ev)=>{
        document.querySelector(".excel_sheets--menu").style.top = `calc(-100% - 55px)`;
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
            {
                let menu = document.querySelector(".excel_table--add_col_menu");
                menu.classList.add("open");

                let menu_rect = menu.getBoundingClientRect();
                let table_rect = this.htmlParent.getBoundingClientRect();
                //set the position now 

                if (table_rect.x > menu_rect.x){
                    menu.style.left = "0px";
                }else if (menu_rect.x + menu_rect.width >= table_rect.x + table_rect.width){
                    menu.style.left = `-${menu_rect.x + menu_rect.width - table_rect.x - table_rect.width + 2}px`;
                }
            }
        })

        document.querySelector(".excel_table--col_plus .excel_table--add_col_menu #add_col").addEventListener("click",()=>{
            if (customSelect !== undefined)
            {
                let colType = customSelect.getPickedOption(document.querySelector(".excel_table--col_plus .excel_table--add_col_menu .custom_select"));
                let colName = document.querySelector(".excel_table--col_plus .excel_table--add_col_menu #col_name").value || "New field";
                
                if (colType != null && colName.trim().length != 0)
                {
                    this.addColumn(colName, colType);
                    document.querySelector(".excel_table--add_col_menu").classList.remove("open");
                }
            }
        })

        document.querySelector("#add_row").addEventListener("click",()=>{
            this.addRow();
        })

        document.addEventListener("keydown",(ev)=>{
            this.shiftKey = ev.shiftKey;
            this.ctrlKey = ev.ctrlKey;
            if (ev.key === "Escape")
            {
                //close all context menus 
                this.closeContextMenus(undefined);

            }
        })

        document.addEventListener("click",(ev)=>{
            let target = ev.target;

            this.closeContextMenus(target);
        })

        document.addEventListener("keyup",(ev)=>{
            this.shiftKey = ev.shiftKey;
            this.ctrlKey = ev.ctrlKey;
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
        });

        document.addEventListener("align", (ev)=>{
            if (this.selectStart !== null)
            {
                let type = ev.detail.value;
                this.getNodesFromSelection().forEach((cellNode)=>{
                    cellNode.style.justifyContent = type;
                    this.loadNodeCellStyles({"styles": {"align": type}}, cellNode)
                })
            }
        })

        document.addEventListener("halign", (ev)=>{
            if (this.selectStart !== null)
            {
                let type = ev.detail.value;
                this.getNodesFromSelection().forEach((cellNode)=>{
                    cellNode.style.alignContent = type;
                    this.loadNodeCellStyles({"styles": {"halign": type}}, cellNode)
                })
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
            }
        })

        document.querySelector("#cond_format").onclick = ()=>{
            document.querySelector("#cond_format").classList.toggle("toggle");
        }
        document.querySelector("#cond_format--manage").addEventListener("click",()=>{
            //first check the selection 
            if (this.getNodesFromSelection().length !== 0)
            {
                if (modalLib_panel !== undefined)
                {
                    if (window.dn === undefined)
                    {
                        window.dn = new DynamicNodes();
                    }

                    modalLib_panel.setView(window.dn.cond_format(this.getCellCoordsFromSelections(), this.getConditionalFormatting(), this.get_cols_array(), this), "Conditional formatting");
                    modalLib_panel.open();
                }
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Please select some cells!"
                }).showToast();
            }
        })

        document.querySelector("#cond_format--clear").addEventListener("click",()=>{
            if (this.getNodesFromSelection().length == 0){
                Toastify({
                    className: "toast_error",
                    text: "Please select some cells"
                }).showToast();
            }else{
                let cb_submit = {
                    context_submit: this,
                    fn: this.wipe_conditionalFormatting,
                    params: []
                };
                new Confirm("Wipe formatting",document.createTextNode(`Are you sure you want to delete the conditional formatting for selected calls?`), {}, cb_submit);

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

            }
        })

        document.addEventListener("decimal_change",(ev)=>{
            let value = ev.detail.value;

            this.getNodesFromSelection().forEach((node)=>{
                if (node.dataset.type == "number")
                {
                    node.dataset.value = this.setDecimals(node.innerText, this.countDecimals(node.innerText) + value);
                    node.innerText = node.dataset.value;
                }
            })
        })

        document.addEventListener("edit_options", (ev)=>{
            let nodes = this.getNodesFromSelection();
            
            if (nodes.length != 0)
            {
                if (modalLib !== undefined)
                {
                    if (window.dn === undefined)
                    {
                        window.dn = new DynamicNodes();
                    }



                    modalLib.setView(window.dn.options_editor(this), "Edit options");
                    modalLib.open();
                }
            }
        })

        document.addEventListener("bg_color",(ev)=>{
            let color = ev.detail.value;

            let nodes = this.getNodesFromSelection();

            nodes.forEach((node)=>{
                this.cell_changed(node.parentElement.dataset.rowNum, node.dataset.colUuid);
                this.loadNodeCellStyles({"styles":{"backgroundColor": color}}, node)
                node.style.backgroundColor = color;
            })
        })

        document.addEventListener("font_color",(ev)=>{
            let color = ev.detail.value;

            let nodes = this.getNodesFromSelection();

            nodes.forEach((node)=>{
                this.cell_changed(node.parentElement.dataset.rowNum, node.dataset.colUuid);
                this.loadNodeCellStyles({"styles":{"color": color}}, node)
                node.style.color = color;
            })
        })
}

excel.prototype.wipe_conditionalFormatting = function(confirm){
    let ids = [];
    let nodes = this.getNodesFromSelection();
    confirm.open();
    nodes.forEach((node)=>{
        if (node.dataset._id)
        {
            ids.push(node.dataset._id)
        }
    })

    $.ajax({
        url: "/excel/conditionalFormatting_wipe",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ids}),
        success: ()=>{
            //start wiping 
            Toastify({
                className: "toast_success",
                text: "Conditional formatting was deleted!"
            }).showToast();

            nodes.forEach((node)=>{
                let data = this.getDataObjectForCell(node);
                delete data.conditional_formatting;
                this.loadNodeCellStyles(data, node);
            })
        },error:()=>{
            Toastify({
                className: "toast_error",
                text: "There was an error!"
            }).showToast();
        }
    })
}

excel.prototype.update_conditionalFormatting = function(nodes, conditions)
{
    nodes.forEach((nodeCoordinate)=>{
        let sanitized_coordinates = nodeCoordinate.split("#")[1];

        let [row, col] = sanitized_coordinates.split("@");
        console.log(this.data[this.getActiveSheet()][row][col].conditional_formatting);
        console.log(conditions);
        this.data[this.getActiveSheet()][row][col].conditional_formatting = conditions;
        console.log(this.data[this.getActiveSheet()][row][col].conditional_formatting);
        //we should load the new styles now hehe
        let node = this.getNodeByCoords(`${row}@${col}`);

        //WORKING 
        conditions.forEach((condition)=>{
            this.formatNodeByConditions(node, condition);
        })
    })
}

excel.prototype.update_remove_conditionalFormatting = function(uuid)
{
    console.log(uuid);
    Object.keys(this.data[this.getActiveSheet()]).forEach((row)=>{
        Object.keys(this.data[this.getActiveSheet()][row]).forEach((col_uuid)=>{
            if (this.data[this.getActiveSheet()][row][col_uuid].conditional_formatting)
            {
                this.data[this.getActiveSheet()][row][col_uuid].conditional_formatting = this.data[this.getActiveSheet()][row][col_uuid].conditional_formatting.filter((elem)=>{elem.uuid != uuid})
                //for this node, reapply the conditions 
                let node = this.getNodeByCoords(`${row}@${col_uuid}`);
                if (this.data[this.getActiveSheet()][row][col_uuid].conditional_formatting.length!=0)
                    this.data[this.getActiveSheet()][row][col_uuid].conditional_formatting.forEach((condition)=>{
                        this.formatNodeByConditions(node, condition);
                    })
                else
                {
                    this.loadNodeCellStyles({styles: this.data[this.getActiveSheet()][row][col_uuid].styles}, node)
                }
            }
        })
    })
}

excel.prototype.get_cols_array = function(){
    let response = [];

    this.header[this.getActiveSheet()].forEach((head)=>{
        response.push(head.name);
    })

    return response;
}

excel.prototype.getConditionalFormatting = function(){
    let response = {};
    this.getNodesFromSelection().forEach((node)=>{
        try{
            response[`${this.getRowId(node)}#${this.getColNameByUuid(node.dataset.colUuid)}`] = this.data[this.getActiveSheet()][this.getRowId(node)][node.dataset.colUuid].conditional_formatting;
        }catch(e){}
    })

    return response;
}

excel.prototype.countDecimals = function(value) {
      return value.toString().split(".")[1]?.length || 0;
  }
  
excel.prototype.setDecimals = function(value, count)
{
    if (count >= 0)
    {
        return parseFloat(value).toFixed(count);
    }

    return value;
}

excel.prototype.setCellType = function (type, test = null)
{   
    test != null && test.open();

    this.getNodesFromSelection().forEach((cellNode)=>{
        let obj = this.getDataObjectForCell(cellNode) || {};
        obj.type = type;
        obj.typeParams = {};

        cellNode.dataset.type = type;
        this.cell_changed(cellNode.parentElement.dataset.rowNum, cellNode.dataset.colUuid);
       this.loadCellTypeView(cellNode, obj.typeParams);

        switch(type){
            case "number":
                cellNode.innerText = parseFloat(cellNode.innerText);
                break;
            case "date":

                break;
        }
    });
}

excel.prototype.closeContextMenus = function(node){
    if (node === undefined || !this.isContextMenu(node))
    {
        //close all context menus
        Array.from(document.querySelectorAll("*[data-for='context_menu']")).forEach((menu)=>{
            menu.classList.remove("open");
        })
    }
}

excel.prototype.isContextMenu = function(node){
    if (node === undefined || node.dataset?.for == "context_menu")
    {
        return true;
    }else if (node.dataset?.for == "close"){
        return false;
    }
    
    return this.searchContextMenu(node);
}

excel.prototype.searchContextMenu = function (startNode)
{
    if (startNode.dataset.for == "context_menu")
        return true;

    if (startNode.tagName === "BODY")
    return false;

    return this.searchContextMenu(startNode.parentElement);
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

excel.prototype.addRow = function(append = true, force_change = false){
    //create a fakeRow object 
    let fakeRow = {};
    fakeRow.rowID = 0;

    //set the grid
    let rowNode = this.dataRow_node(fakeRow, this.getRowCount() + 1, null);
    rowNode.style.gridTemplateColumns = this.dataRowsWidth();

    if (force_change)
    {
        this.fake_change_cell(rowNode.children[1]);
    }

    if (!append){
        return rowNode;
    }

    this.htmlParent.querySelector(".excel_table--body").appendChild(rowNode);
}

excel.prototype.fake_change_cell = function (cellNode)
{
    this.cell_changed(this.getRowId(cellNode), cellNode.dataset.colUuid);
}

excel.prototype.addColumn = function(colName, colType){



    let col_Object = {
        "name": colName,
        "type": colType,
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
                    console.log(col_Object);
                    row.appendChild(this.cellNode(col_Object, this.header[this.getActiveSheet()].length))
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

excel.prototype.getActiveSheetData = function(){
    return this.sheets[this.active_sheetIndex];
}

excel.prototype.autoSize = function(){

    //foreach column we should get the maximum width of it

    let headerNodes = this.htmlParent.querySelectorAll(".excel_table--header_elem");
    let rows = this.htmlParent.querySelectorAll(".excel_table--body_row");
    let templateCols = '';
    for (_index in this.header[this.getActiveSheet()])
    {
        let header_node_width =  this.header[this.getActiveSheet()][_index].width !== undefined ? this.header[this.getActiveSheet()][_index].width : (headerNodes[_index].clientWidth < 150 ? 150 : headerNodes[_index].clientWidth);

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
    let rowTemp = this.dataRowsWidth();

    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((row)=>{
        row.style.gridTemplateColumns = rowTemp;
    })
}

excel.prototype.autoSizeRows_byHeader = function(){
    let templateCols = this.htmlParent.querySelector(".excel_table--header_items").style.gridTemplateColumns;

    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row ")).forEach((rowNode)=>{
        rowNode.style.gridTemplateColumns = templateCols;
    })
}

excel.prototype.dataRowsWidth = function(){
    let template = this.htmlParent.querySelector(".excel_table--header_items").style.gridTemplateColumns, newTemplate = '';
    
    template.split(" ").forEach((size, index)=>{
        if (index == 0)
            newTemplate += `${parseInt(size) - 3}px `;
        else
            newTemplate += `${parseInt(size)}px `;
    })

    return newTemplate;
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

excel.prototype.appendData = function(data, init = false){
    let prevCell = null;
    
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
            "_id": cell?._id,
            "formula": cell?.formula || "",
            "styles": cell?.styles || {},
            "value": cell?.value || "",
            "type": cell?.type || "string",
            "typeParams": cell?.typeParams,
            "hyperlink": cell?.hyperlink || false,
            "conditional_formatting": cell?.conditional_formatting || null
        }
        prevCell = cell;
    })
}

excel.prototype.cellNode_toCoords = function(node)
{   
    //[rowId, cellId]
    return [this.getRowId(node), node.dataset._id];
}

excel.prototype.getDataObjectForCell = function (node){
    let typeParams = {};
    switch(node.dataset.type)
    {
        case 'date':
        typeParams.format = node.dataset.format;
        break;
    }

    try{
        let cellCoords = this.cellNode_toCoords(node);

        if (this.data[this.getActiveSheet()][cellCoords[0]][node.dataset.colUuid] === undefined)
        this.data[this.getActiveSheet()][cellCoords[0]][node.dataset.colUuid] = {typeParams}

        return this.data[this.getActiveSheet()][cellCoords[0]][node.dataset.colUuid];
    }catch(e){
        if (this.data[this.getActiveSheet()] === undefined)
        {
            this.data[this.getActiveSheet()] = {};
        }

        if (this.data[this.getActiveSheet()][this.getRowId(node)] === undefined){
            this.data[this.getActiveSheet()][this.getRowId(node)] = {};
        }
        this.data[this.getActiveSheet()][this.getRowId(node)][node.dataset.colUuid] = {typeParams};
        
        return this.data[this.getActiveSheet()][this.getRowId(node)][node.dataset.colUuid];
    }
}


excel.prototype.parseData = function(){
    $.ajax({
        url: "/excel/parse_rows",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"sheetId": this.getActiveSheet()}),
        success: (data)=>{
            this.rowCount[this.getActiveSheet()] = 0;
            this.appendData(data, true);
            this.load_cells();
            this.runFormulas();
            this.calculateSize();
            //this.addInitRows();
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
    
    this.header[this.getActiveSheet()].map((header, _index)=>{
            frag.appendChild(this.header_node(header));
    })

    this.htmlParent.querySelector(".excel_table--header_items").appendChild(frag);
}

excel.prototype.header_node = function (header_object)
{
    let temp = document.createRange().createContextualFragment(header_cell_template);
    let container = temp.children[0];

    let resize = container.querySelector(".excel_table--header_drag");

    temp.querySelector("div").dataset.uuid = header_object.uuid;
    if (header_object?.width){
        container.dataset.width = header_object.width;
    }
    temp.querySelector("header_name").textContent = header_object.name;
    
    //TODO -> button listeners 
    let action_buttons = temp.querySelectorAll("button");

    resize.addEventListener("mousedown",(ev)=>{
        this.resize_header = container;
        this.resize_offset = ev.offsetX;
        this.resize_init = Math.ceil(container.getBoundingClientRect().width);
    })

    resize.addEventListener("mouseup",()=>{
        if (this.resize_header !== null){
            this.resize_header = null;
            this.resize_offset = 0;
            this.resize_init = 0;

            this.update_headerWidth(header_object.uuid, container.getBoundingClientRect().width);
            this.autoSizeRows_byHeader();
        }
    })

    resize.addEventListener("mouseout",()=>{
        if (this.resize_header !== null){
            this.resize_header = null;
            this.resize_offset = 0;
            this.resize_init = 0;

            this.update_headerWidth(header_object.uuid, container.getBoundingClientRect().width);
            this.autoSizeRows_byHeader();
        }
    })

    //delete button 
    action_buttons[2].addEventListener("click",()=>{
        let cb_submit = {
            context_submit: this,
            fn: this.removeColumn,
            params: [header_object.uuid]
        };

        new Confirm("Delete column",document.createTextNode(`Are you sure you want delete the column ${header_object.name}?`), {}, cb_submit);
    });

    action_buttons[3].addEventListener("click",()=>{
        action_buttons[3].classList.toggle("active");
        container.classList.toggle("selected");

        if (!container.classList.contains("selected"))
            return;
        let rows = document.querySelector(".excel_table--body").children;
        
        //here we select everything 
        this.selectStart = rows[1].querySelector(`.excel_table--body_cell[data-col-uuid='${header_object.uuid}']`);
        this.selectEnd = rows[rows.length-1].querySelector(`.excel_table--body_cell[data-col-uuid='${header_object.uuid}']`);

        //position the cellSelector
        this.positionCellSelector(this.calculateSelectWidth(), this.calculateSelectHeight());

    })

    action_buttons[4].addEventListener("click",()=>{
        //show cell notes
        if (modalLib !== undefined)
        {
            if (window.dn === undefined)
            {
                window.dn = new DynamicNodes();
            }
            let head_obj = this.get_header_object(header_object.uuid);
    
            let textarea = window.dn.textarea( head_obj === undefined ? header_object.notes : head_obj.notes);
            
            modalLib.setView(
                window.dn.frag(
                    textarea,
                    window.dn.button("submit_button", "Submit notes", "fa-regular fa-check",{"display": "flex", "margin-left":"auto", "margin-top": "15px"},{
                        fn: this.update_notes,
                        context: this,
                        args: [header_object.uuid, textarea]
                    })
                )
                ,"Column notes");
                modalLib.open();
        }
    })

    action_buttons[5].addEventListener("click",()=>{
        
        if (window.dn === undefined){
            window.dn = new DynamicNodes();
        }

        let input = window.dn.input("Column name", "", container.querySelector("header_name").textContent);
        
        let cb_submit = {
            context_submit: this,
            fn: this.renameColumn,
            params: [input, header_object.uuid]
        };

        new Confirm("Rename column",
        window.dn.frag(
            window.dn.textNode_html(`Are you sure you want to rename column <b>${container.querySelector("header_name").textContent}</b> to: `),
            input
        ), {}, cb_submit);

    })

    return temp;
}

excel.prototype.update_headerWidth = function (header_uuid, width){
    $.ajax({
        url: "/excel/update_headerWidth",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({uuid: header_uuid, width}),
        success: ()=>{
            Toastify({
                className: "toast_success",
                text: "Document was synced"
            }).showToast();
        },error: ()=>{
            Toastify({
                className: "toast_error",
                text: "Document could not be synced"
            }).showToast();
        }
    })
}

excel.prototype.update_notes = function (uuid, notes_input)
{

    $.ajax({
        url: "/excel/update_col_notes",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({uuid, notes: notes_input.value}),
        success: ()=>{
            Toastify({
                className: "toast_success",
                text: "The notes have been updated!"
            }).showToast();
            let head = this.get_header_object(uuid);
            head.notes = notes_input.value;

        },error: ()=>{
            Toastify({
                className: "toast_success",
                text: "The notes could not be updated!"
            }).showToast();
        }
    })
}

excel.prototype.renameColumn = function (input, uuid, confirm)
{
    $.ajax({
        url: "/excel/rename_column",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({input: input.querySelector("input").value, uuid}),
        success: ()=>{
            confirm.open();
            Toastify({
                className: "toast_success",
                text: "The column was renamed!"
            }).showToast();

            //now renae the column -- displayName 
            document.querySelector(`.excel_table--header_elem[data-uuid='${uuid}'] header_name`).textContent = input.querySelector("input").value;

            //change the header object 
            if (this.header[this.getActiveSheet()])
            {
                this.header[this.getActiveSheet()].forEach((head)=>{
                    if (head.uuid === uuid){
                        head.name = input.querySelector("input").value;
                    }
                });

            }
        },error: ()=>{
            confirm.open();
            Toastify({
                className: "toast_error",
                text: "The column was not renamed!"
            }).showToast();
        }
    })
}

excel.prototype.removeColumn = function (uuid, confirm)
{
    $.ajax({
        url: "/excel/remove_column",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({uuid}),
        success: ()=>{
            confirm.open();
            Toastify({
                className: "toast_success",
                text: "The column was deleted!"
            }).showToast();

            //remove the cells now 
            let header = document.querySelector(`.excel_table--header_elem[data-uuid='${uuid}']`);
            let index = Array.from(header.parentNode.children).indexOf(header);

            header.style.display = "none";
            Array.from(document.querySelectorAll(".excel_table--body_row")).forEach((row)=>{
                row.children[index + 1].style.display = "none";
            })

        },error: ()=>{
            confirm.open();
            Toastify({
                className: "toast_error",
                text: "The column was not deleted!"
            }).showToast();
        }
    })
}

excel.prototype.clear_data = function (){
    Array.from(this.htmlParent.querySelectorAll(".excel_table--body_row")).forEach((el)=>el.remove());
}

excel.prototype.load_cells = function(){
    let frag = document.createDocumentFragment();
    let prevRow = 1;

    Object.keys(this.data[this.getActiveSheet()] || []).forEach((rowId, _index)=>{
       
        
        for (let i = 1;i<=rowId - prevRow - 1;i++)
            {
                frag.appendChild(this.addRow(false));
            }
            console.log(rowId);
        frag.appendChild(this.dataRow_node(this.data[this.getActiveSheet()][rowId], rowId, rowId));
        prevRow = rowId;
    })

    this.htmlParent.querySelector(".excel_table--body").appendChild(frag);
    this.autoSize();

    if (this.header[this.getActiveSheet()].length != 0)
    for (let i = 1;i<=30-prevRow;i++)
    {
        this.addRow();
    }
}

excel.prototype.dataRow_node = function(data_Object, _index, id)
{
    this.increaseRows();

    let row = document.createElement("div"), frag = document.createDocumentFragment(), rowDetails = document.createElement("div");
    row.className = "excel_table--body_row ";    
    row.dataset.rowNum = _index;
    id ? row.dataset.uuid = id : "";

    rowDetails.className = "excel_table--body_row_data";
    rowDetails.textContent = _index;

    rowDetails.onclick = ()=>{
        row.classList.toggle("selected");
        //here the magic happends 
        let cells = row.querySelectorAll(".excel_table--body_cell");

        this.selectStart = cells[0];
        this.selectEnd = cells[cells.length - 1];

        //position the cellSelector
        this.positionCellSelector(this.calculateSelectWidth(), this.calculateSelectHeight());
    }

    row.appendChild(rowDetails);

    row.appendChild(this.populateRow(data_Object));
   
    if (_index === this.rowToSelect)
    {
        //select this row
        //run this later 
        setTimeout(()=>{
            try{
                this.select_cell(null, row.children[1], null);
                this.rowToSelect = -1;
            }catch(e){
                setTimeout(()=>{
                    this.select_cell(null, row.children[1], null);
                }, 100)
            }
        }, 100);
    }

    return row;
}

excel.prototype.populateRow = function(rowData){
    let frag = document.createDocumentFragment();
    
    //first we append the cols we have in the rowData Object in the header order !! 
    this.header[this.getActiveSheet()].forEach((header_elem, _index)=>{
        //check if we have it
        if (rowData[header_elem.uuid]){
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
        console.log(this.getDataObjectForCell(node));
        if (node != null)
            data[cellCoords] = {
                "styles": this.buildStylesObject(node),
                "value": node.dataset?.value || "",
                "formula": node.dataset.formula,
                "type": node.dataset?.type || "string",
                "typeParams": this.getDataObjectForCell(node)?.typeParams || {}
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
                Toastify({
                    className: "toast_success",
                    text: "Document saved!"
                }).showToast();
            },error: ()=>{
                Toastify({
                    className: "toast_error",
                    text: "Document was not saved!"
                }).showToast();
            }
        })
    else{
        Toastify({
            className: "toast_warning",
            text: "No changes to be saved!"
        }).showToast();
    }
}

excel.prototype.formatNodeByConditions = function(node, condition)
{
            switch(condition.type){
                case "greater":
                    if (parseInt(node.dataset.value) > parseInt(condition.values[0]))
                    {
                        this.loadNodeCellStyles(condition, node)
                    }
                    break;
                    case "smaller":
                        if (parseInt(node.dataset.value) < parseInt(condition.values[0]))
                        {
                            this.loadNodeCellStyles(condition, node)
                        }
                    break;
            }
}

excel.prototype.cellNode = function (col_Object, _index)
{
    let cell = document.createElement("div");
    cell.className = "excel_table--body_cell";
    cell.contentEditable = true;
    cell.textContent = col_Object.value;

    let header_object = this.get_header_object(col_Object.uuid)

    cell.dataset.value = col_Object?.value !== undefined ? col_Object.value : "";
    cell.dataset.cellIndex = _index;
    cell.dataset.colUuid = col_Object.uuid;
    cell.dataset.type = col_Object?.type || header_object?.colType;
    cell.dataset.hyperlink = col_Object.hyperlink;
    cell.dataset.formula = col_Object.formula;
    cell.dataset._id = col_Object._id;

    if (col_Object?.formula && col_Object.formula != null && col_Object.formula != undefined && col_Object.formula != "undefined" && col_Object.formula.trim() != "")
    {
        this.pendingCells.push(cell);
        cell.textContent = "Loading formula";
    }

    if (col_Object?.typeParams)
    {
        Object.keys(col_Object.typeParams).forEach((typeParam)=>{
            cell.dataset[typeParam] = col_Object.typeParams[typeParam];
        })
    }
    this.loadNodeCellStyles(col_Object, cell);
    this.loadCellTypeView(cell, col_Object?.typeParams);

    if (col_Object.conditional_formatting !== null && col_Object.conditional_formatting !== undefined){
        col_Object.conditional_formatting.forEach((condition)=>{
            this.formatNodeByConditions(cell, condition);
        })
    }

    cell.onclick = (ev)=>{
        this.select_cell(col_Object, cell, ev);
        if (col_Object.hyperlink === true)
        {
            console.log("this is hyperlink")
        }
        switch(cell.dataset.type)
        {
            case "date":
                //show the calendar 
                if (cal instanceof calendar)
                {
                    cal.setCallback(this, this.setCellValue, cell);
                    cal.moveTo(cell);
                    cal.open();
                }    
            break;
            case "options":
                //populate options 
                let list = cell.querySelector(".type_options--list");

                Array.from(list.children).forEach(option=>option.remove());
                col_Object.typeParams?.options?.forEach((option)=>{
                    let option_node = document.createElement("div");
                    option_node.className = 'type_options--option ' + (col_Object.typeParams?.selected == option.uuid ? "active" : "");
                    option_node.textContent = option.value;
                    
                    option_node.onclick = ()=>{
                        cell.querySelector(".type_options--option.active")?.classList.remove("active");
                        col_Object.typeParams.selected = option.uuid;
                        cell.querySelector("option_value").textContent = option.value;
                        option_node.classList.add("active");
                    };
                    list.appendChild(option_node);
                })
                cell.classList.toggle("active");
            break;
        }
    }

    cell.onblur = (ev)=>{
        this.setCellValue(cell);
        cell.classList.remove("active");
    }

    cell.onkeydown = (ev)=>{
        //check if type allows 
        switch(cell.dataset.type)
        {
            case "string": 
                this.cell_changed(cell.parentElement.dataset.rowNum, col_Object.uuid);            
            break;
            case "number": 
                if ((ev.key >= '0' && ev.key <= '9') || ev.ctrlKey || ev.shiftKey || ev.key === "Enter" || ev.altKey || ev.key === "Backspace" || ev.key === "Delete") 
                    this.cell_changed(cell.parentElement.dataset.rowNum, col_Object.uuid);
                else
                {
                    Toastify({
                        text: "You are not allowed to type this character in this field!",
                        className: "toast_warning",
                    }).showToast();
                    ev.preventDefault();
                }
            break;
            case "options":
                Toastify({
                    text: "You are not allowed to type in this field!",
                    className: "toast_warning",
                }).showToast();
                ev.preventDefault();
                break;
            case "date":
                if (ev.ctrlKey || ev.shiftKey || ev.key === "Enter" || ev.altKey)
                {
                    //do nothing
                }else{
                    Toastify({
                        text: "You are not allowed to type in this field!",
                        className: "toast_warning",
                    }).showToast();
                    ev.preventDefault();
                }
            break;
        }
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

    if (col_Object.hyperlink)
    {
        cell.addEventListener("click", (ev)=>{
            if (this.formula.nodeSelector)
            {
                return;
            }
            if (this.ctrlKey)
            {
                //do somethjng
                this.hyperlink_click(col_Object._id);
            }else{
                Toastify({
                    className: "toast_warning",
                    text: "Please hold ctrl to activate the link"
                }).showToast();
            }
        });
    }

    return cell;
}

excel.prototype.gotoDoc = function(paeg_name, doc_name, sheet, row)
{
    window.location.href = "/document/"+paeg_name+"/"+doc_name+"?sheet="+sheet+"&row="+row;
}

excel.prototype.hyperlink_click = function (_id){
    $.ajax({
        url: "/excel/run_hyperlink",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({_id}),
        success: (data)=>{
            console.log(data);
            if (data?.success === true)
            {
                //show confirmation
                let {sheetId, sheet, row, column, doc_id, doc_name, pageName} = data;
                let current_doc_id = document.querySelector("#doc_id").value;

                if (current_doc_id !== doc_id)
                {
                    let cb_submit = {
                        context_submit: this,
                        fn: this.gotoDoc,
                        params: [pageName, doc_name, sheet, row]
                    };
                    new Confirm("Leave document",document.createTextNode("Are you sure you want to follow this hyperlink? This will get you to another page!"), {}, cb_submit);

                }else{
                    //select the needed sheetId
                    this.sheets.forEach((sheet)=>{
                        if (sheet._id === sheetId)
                        {
                            this.rowToSelect = row;
                            sheet.node.click();
                        }
                    })
                }
                
            }else{
                Toastify({
                    className: "toast_error",
                    text: data?.body || "Hyperlink error"
                }).showToast();
            }
        },error: (err)=>{
            Toastify({
                className: "toast_error",
                text: err.responseJSON?.body || "Hyperlink error"
            }).showToast();
        }
    })
}

excel.prototype.format_date = function (date, format)
{
    if (format === undefined)
    {
        format = "DD.MM.YYYY";
    }
    console.log('%c' + date, 'color: orange');

    if (!date)
    {
        return "Select date";
    }

    //frst parse the date 
    date = dayjs(date, "DD.MM.YYYY", true);
    if (date.isValid())
    {
        return date.format(format);
    }else{
        return "Error";
    }

}

excel.prototype.loadCellTypeView = function(node, data)
{
    switch(node.dataset.type)
    {
        case "string":
            break;
        case "number":
            break;
        case "date":
            let date_value = document.createElement("date_value");
            date_value.innerText = this.format_date(node.innerText, data?.format);
            node.innerText = "";
            node.appendChild(date_value);
            node.classList.add("type_date");
        break;
        case "options":
            let option_value = "Select an option";
            if (data?.selected)
            {
                //search the one which is selected 
                data?.options?.forEach((option)=>{
                    console.log(option);
                    if (option.uuid == data.selected)
                    {
                        option_value = option.value;
                    }
                })
            }
            let selected_option = document.createElement("option_value");
            selected_option.textContent = option_value;
            node.innerText = "";
            node.appendChild(selected_option);
            node.appendChild(this.options_selectList());

            node.classList.add("type_options");
        break;
        case "check":
            let check_value = document.createElement("check_value");
            check_value.innerText = node.dataset.value;
            node.innerText = "";
            node.appendChild(check_value);

            node.contentEditable = false;
            check_value.contentEditable = true;
            check_value.style.outline = "none";

            node.addEventListener("click",  ()=>{
                if (this.ctrlKey)
                    {
                        //mutability of object 
                        let data_Object = this.getDataObjectForCell(node);
                        console.log(data_Object);
                        if (node.classList.contains("checked")){
                            data_Object.typeParams.checked = false;
                            node.classList.remove("checked");
                        }else{
                            data_Object.typeParams.checked = true;
                            node.classList.add("checked");
                        }
                    this.fake_change_cell(node);
                    }
                else{
                    Toastify({
                        className: "toast_warning",
                        text: "Press ctrl to toggle the checkbox!"
                    }).showToast();
                }
            });

            check_value.onkeydown = ()=>{
                this.fake_change_cell(node);
            }

            check_value.onblur = ()=>{
                this.setCellValue(node, check_value.textContent);
            }

            data?.checked === true && node.classList.add("checked");
            node.classList.add("type_check");
        break;
    }
}

excel.prototype.options_selectList = function(options){
    let container = document.createElement('div');
    container.className = "type_options--container";
    container.contentEditable = false;

    let list = document.createElement("div");
    list.className = "type_options--list";
    list.contentEditable = false;
    container.appendChild(list);

    return container;
}

excel.prototype.setCellValue = function(node, value = "", context = null){
    let type = node.dataset?.type || "string";
    
    (context != null ? context : this).cell_changed(node.parentElement.dataset.rowNum, node.dataset.colUuid);

    switch(type){
        case "string": 
            node.dataset.value = value || node.innerText;
        break;
        case "number": 
            node.dataset.value = value || node.innerText;
        break;
        case "date":
            if (value !== "")
            {
                node.dataset.value = dayjs(value).format("DD.MM.YYYY");
                node.querySelector("date_value").innerText = (context != null ? context : this).format_date(dayjs(value).format("DD.MM.YYYY"), node.dataset.format);
            }else{
                node.querySelector("date_value").innerText = (context != null ? context : this).format_date(dayjs(node.dataset.value, "DD.MM.YYYY"), node.dataset.format);
            }
        break;
        case "check":
            node.dataset.value = value;
            break;
    }   
}

excel.prototype.loadNodeCellStyles = function (col_Object, node){
    if (col_Object.styles)
    {
        Object.keys(col_Object.styles).forEach((key)=>{
            if (key === "fontSize")
            {
                node.style[key] = `${col_Object.styles[key]}px`;
            }else if(key === "align"){
                node.style["justifyContent"] = col_Object.styles[key];
            }else if(key === "halign"){
                node.style["alignContent"] = col_Object.styles[key];
            }else{
                node.style[key] = col_Object.styles[key];
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
            this.font.loadCellType(node);
        }

        console.log("position");
        //position the cellSelector
        this.positionCellSelector(this.calculateSelectWidth(), this.calculateSelectHeight());
    }
    else{
        event.preventDefault();
    }

    let ev = new CustomEvent("cellSelected",{
        detail: {
            value: `$${this.getRowId(node)}@${this.getColNameByUuid(node.dataset.colUuid)}`
        }
    });
    document.dispatchEvent(ev);
}

excel.prototype.getRowId = function (node)
{
    return node.parentNode.dataset?.uuid || node.parentNode.dataset.rowNum;
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

excel.prototype.resetCellSelector = function(){
    let cellSelector = document.querySelector(".cell_selector")
    cellSelector.style.top = "0px";
    cellSelector.style.left = "0px";
    cellSelector.style.width = "0px";
    cellSelector.style.height = "0px";
    this.selectStart = null;
    this.selectEnd = null;
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
    cellSelector.style.height = `${height + (parseInt(this.selectEnd.parentNode.dataset.rowNum) - parseInt(this.selectStart.parentNode.dataset.rowNum)) + 1}px`;

}

excel.prototype.calculateSelectWidth = function()
{
    let indexStart = this.selectStart.dataset.cellIndex, indexEnd = this.selectEnd.dataset.cellIndex,width = 0;

    //calculate the widths 
    for (let indexCell = parseInt(indexStart); indexCell <= parseInt(indexEnd); indexCell++)
    {
        width += document.querySelector(`.excel_table--body_cell[data-cell-index='${indexCell}']`).getBoundingClientRect().width;
    }

    return width;
}

excel.prototype.calculateSelectHeight = function()
{
    let startRowIndex = this.selectStart.parentNode.dataset.rowNum, endRowIndex = this.selectEnd.parentNode.dataset.rowNum, height = 0;

    for (let indexRow = parseInt(startRowIndex); indexRow <= parseInt(endRowIndex); indexRow++)
    {
        height += document.querySelector(`.excel_table--body_row[data-row-num='${indexRow}']`).getBoundingClientRect().height;
    }

    console.log(height);
    return height;
}

excel.prototype.getNodesFromSelection = function()
{
    try{
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
    }catch(e){
        return [];
    }
}

excel.prototype.getCellCoordsFromSelections = function(){
    let response = [];
    this.getNodesFromSelection().forEach((node)=>{
        response.push(
            `!${this.getActiveSheet()}#${this.getRowId(node)}@${node.dataset.colUuid}`
        )
    })

    return response;
}

excel.prototype.getNodeByCoords = function(cellCoords){
    let rowId = cellCoords.split("@")[0], uuid = cellCoords.split("@")[1];
    return this.htmlParent.querySelector(`.excel_table--body_row[data-row-num='${rowId}']`)?.querySelector(`.excel_table--body_cell[data-col-uuid='${uuid}']`) || null;
}

excel.prototype.getColNameByUuid = function(uuid, replace = true)
{
    try{
        for (let index = 0;index<=this.header[this.getActiveSheet()].length;index++)
        {
            if (this.header[this.getActiveSheet()][index].uuid === uuid)
            {
                if (replace)
                    return this.header[this.getActiveSheet()][index].name.replaceAll(" ","");
                else
                    return this.header[this.getActiveSheet()][index].name;
            }
        }
    }catch(e){
        return "";
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
    return /^\$[0-9]*\@[a-zA-Z0-9-_]*$/.test(cellCoords);
}

excel.prototype.getCellValueByCoords = function(cellCoords){
    if (!this.validCellCoords(cellCoords))
        return cellCoords;

    let rowNum = cellCoords.split("@")[0].slice(1,), cellIndex = this.getCellIndexByHeaderName(cellCoords.split("@")[1]);
    let cellNode = document.querySelector(`.excel_table--body_row[data-row-num='${rowNum}']`)?.querySelector(`.excel_table--body_cell[data-cell-index='${cellIndex}']`);

    if (cellNode === null)
    {
        return null;
    }

    return cellNode.dataset.value;
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

excel.prototype.node_toCellCoords = function (node, replace = true)
{
    let {sheetName} = this.sheets[this.active_sheetIndex];
    return `!${sheetName}#${node.parentNode.dataset.rowNum}@${this.getColNameByUuid(node.dataset.colUuid, replace)}`;
}

excel.prototype.node_to_simpleCoords = function (node){
    return `${node.parentNode.dataset.rowNum}@${this.getColNameByUuid(node.dataset.colUuid)}`;
}

excel.prototype.sheetNameToId = function (sheetName)
{
    for (const sheetData of this.sheets)
    {
        if (sheetData.sheetName == sheetName){
            return sheetData._id;
        }
    }

    return sheetName;
}

excel.prototype.colNameToUuid = function (colName)
{
    for (const headerElem of this.header[this.getActiveSheet()]){
        console.log(headerElem.name.replaceAll(" ", ""));
        console.log(colName);
        if (headerElem.name.replaceAll(" ", "") === colName){
            return headerElem.uuid;
        }
    }

    return colName;
}

excel.prototype.coordsToGeneral = function (input)
{
    console.log(input);
    input = input.replace(/(!([a-zA-Z0-9_-]*))?#?(X(\-|\+)(\d+))@?([a-zA-Z0-9-_]*)/gm, (match, g1, g2, g3, g4, g5, g6)=>{
        console.log(match);
        //g2 is sheetName, g3 is row, g6 is column
        if (g2 === undefined)
        {
            return `!${this.getActiveSheet()}#${g3}@${this.colNameToUuid(g6)}`;      
        }else{
            return `!${this.sheetNameToId(g2)}#${g3}@${this.colNameToUuid(g6)}`;
        }

    })

    return input;
}

excel.prototype.generalToLocalCoords = function (formula)
{
    formula = formula.replace(/\$\!([a-zA-Z0-9\-_]*)#([a-zA-Z\-0-9]*)@([a-zA-Z0-9\-_]*)/gm,(match, sheet, row, uuid)=>{
        return `$${row}@${this.getColNameByUuid(uuid)}`
    })

    return formula;
}

excel.prototype.runFormulas = function(){
    this.pendingCells.forEach((cell)=>{
        let formula = this.generalToLocalCoords(cell.dataset.formula.trim());
        cell.textContent = this.formula.runFormula(this.formula.compileGeneralizedFormula(formula, this.getRowId(cell)));
    });
    this.pendingCells = [];
}

excel.prototype.get_header_object = function (uuid)
{
    if (this.header[this.getActiveSheet()]){
        for (const head of this.header[this.getActiveSheet()])
        {
            if (head.uuid === uuid){
                return head;
            }
        }
    }

    return undefined;
}