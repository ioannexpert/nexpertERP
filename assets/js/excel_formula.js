const nodeSelectorEvent = document.createEvent("HTMLEvents");
nodeSelectorEvent.initEvent("nodeSelector_change", true, true);

const delimiters = [",", " ", "(", ")"];

const coordsRegex = /^\$([0-9]*)\@([a-zA-Z0-9]*)$/;

function formula_maker(input, list)
{
    this.input = input;
    this.list = list;
    this.nodeSelector = false;
    this.ctrlKey = false;
    this.args = null;

    this.excelTable = null;

    this.FUNCTIONS = [
        {
            "displayName": "Min",
            "formula_name": "MIN",
            "docs": "this function does the MIN",
            "click_fn": this.minClick
        },
        {
            "displayName": "Sum",
            "formula_name": "SUM",
            "docs": "this function does the SUM",
            "click_fn": this.sumClick
        }
    ];
}

formula_maker.prototype.bindTable = function(context){
    this.excelTable = context;
}

formula_maker.prototype.getCursorPosition = function()
{
    const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        
        const range = selection.getRangeAt(0);
        const offset = range.startOffset;
    
        return {offset, "node": selection.anchorNode};  
    }
    return -1;
}

formula_maker.prototype.reverseString = function(string)
{
    let reversedString = "";
    for (const character of string) {
        reversedString = character + reversedString;
      }

      return reversedString;
}

formula_maker.prototype.getEditingWord = function(input, cursor)
{
    let word = "";

    for (let i = cursor;i>=0;i--)
    {
        let c = input.charAt(i);
        if (delimiters.indexOf(c) == -1)
            word += input.charAt(i);
        else
        break;
    }

    return this.reverseString(word);
}

formula_maker.prototype.wordType = function (word)
{
    if (coordsRegex.test(word))
        return 0;
    return 1;
}

formula_maker.prototype.searchHeader = function (input)
{
    let sanitizedInput = input.split("@")[1] || input;
    let searchingArray = [], returnedData = [];
    
    sanitizedInput = sanitizedInput.toLowerCase();

    this.excelTable.header.forEach((header_elem)=>{
        searchingArray.push(header_elem.name.replaceAll(" ",""));
    })

    for (const headerId of searchingArray)
    {
        if (headerId.toLowerCase().indexOf(sanitizedInput) != -1){
            returnedData.push(headerId);
        }
    }

    return returnedData;
}

formula_maker.prototype.searchFunction = function (input)
{
    let searchArray = [], returnedData = [];

    //build seatch db
    this.FUNCTIONS.forEach((fn)=>{
        searchArray.push(fn.formula_name);
    })

    for (fn of searchArray)
    {
        if (fn.indexOf(input) != -1)
        {
            returnedData.push(fn);
        } 
    }

    return returnedData;
}

formula_maker.prototype.populateSearchList = function(data, type, list, input, node){
    
    //clear list 
    Array.from(list.children).forEach((e)=>e.remove());

    let frag = document.createDocumentFragment();
    
    for (const match of data)
    {
        let result = document.createElement("div"), i = document.createElement("i");
        result.className = "excel_formula--result";
        
        i.className = "fa-regular fa-function";
        if (type == 0)
        {
            i.className = "fa-regular fa-table-cells";
        }

        result.appendChild(i);
        result.appendChild(document.createTextNode(match));

        result.onclick = ()=>{
            this.selectAutoComplete(match, type, input, node);
        }
        result.onmousedown = (ev)=>{
            ev.preventDefault();
        }
        frag.appendChild(result);
    }   

    list.appendChild(frag);
}

formula_maker.prototype.replaceLastOccurrence = function (inputString, search, replace) {
    const lastIndex = inputString.lastIndexOf(search);
    if (lastIndex !== -1) {
      const before = inputString.substring(0, lastIndex);
      const after = inputString.substring(lastIndex + search.length);
      return before + replace + after;
    }
    return inputString;
  }

formula_maker.prototype.selectAutoComplete = function(result, type, inputWord, node)
{
    if (type == 0)
    {
        //replace logic here
        let text = node.innerText.trim();
        node.innerText = this.replaceLastOccurrence(text, inputWord.split("@")[1], result);
        //move cursor at the end now 
        this.cursorAtEndOfNode(node);

    }   
    else{
        //more complicated, add the fn node
        console.log("type is 1");
    }
    console.log("replace currently working with ", result);
}   

formula_maker.prototype.cursorAtEndOfNode = function (node)
{
    let range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);

    // Create a Selection object and set the range
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

formula_maker.prototype.init_fns = function(){

    this.input.classList.add("disabled");

    this.input.addEventListener("focusout",()=>{
        document.querySelector(".excel_formula--searchList").classList.remove("on");
    })

    this.input.addEventListener("keyup",(ev)=>{
        
        let cursorPosition = this.getCursorPosition();

        if (typeof cursorPosition === "object")
        {
            let input = cursorPosition.node.parentNode.innerText.trim();
            let list = document.querySelector(".excel_formula--searchList");

            //now we should get the word we are editing
            let word = this.getEditingWord(input, cursorPosition.offset).trim(); 
            let wordType = this.wordType(word);
        
            if (wordType == 0)
            {
                //this is a coordinate, check headers
                this.populateSearchList(this.searchHeader(word), 0, list, word, cursorPosition.node.parentNode);
            }   
            else{
               //this is a function 
               this.populateSearchList(this.searchFunction(word), 1, list, word, cursorPosition.node.parentNode); 
            }

            list.classList.add("on");
        }

        if (ev.key == "Backspace")
        {
            //clear the empty func node
            Array.from(this.input.querySelectorAll("func")).forEach((func_node)=>{
               
                if (func_node.childNodes[0].nodeType !== 3)
                {
                    func_node.remove();
                }
            })  
            this.args = null;
          
            if(this.input.innerText.trim().length == 0 || this.input.children[0].tagName == "BR")
            {
                this.input.innerHTML = "";
                this.input.appendChild(document.createTextNode("\u00A0"));
                this.input.classList.add("empty")
                this.input.blur();

            }
        }
    })

    document.querySelector(".formula_apply").onclick = ()=>{
        this.change_nodeSelector(false);
    }

    document.addEventListener("keydown",(ev)=>{
        this.ctrlKey = ev.ctrlKey;

        if (this.args)
        {
            if (this.args.innerText == "Add args" && /^[a-zA-Z0-9\$]$/.test(ev.key)){
                this.args.innerText = ev.key;
                var range = document.createRange()
                var sel = window.getSelection()
                
                range.setStart(this.args, 1)
                range.collapse(true)
                
                sel.removeAllRanges()
                sel.addRange(range)
                ev.preventDefault();
            }
            else if (ev.key === "Backspace")
            {
                if (this.args.innerText.length <= 1)
                {
                    this.args.innerText = "Add args";
                    ev.preventDefault();
                }
            }
        }
    })

    document.addEventListener("keyup",(ev)=>{
        this.ctrlKey = ev.ctrlKey;
    })

    document.addEventListener("cellSelected",(ev)=>{
        if (this.excelTable.getNodesFromSelection().length == 0)
        {
            this.input.classList.add("disabled");
        }
        else{
            //so we have some cells selected 
            if (this.args === null)
            {
                this.showFormula(this.excelTable.getNodesFromSelection());
            }
            this.input.classList.remove("disabled");
        }

        if (this.args !== null)
        {
            this.input.focus();
            //check if ctrl key is pressed 
            if (this.ctrlKey)
            {
                //add one more
                this.addFormulaCell(ev.detail.value);
            }else{
                //replace 
                this.overwriteFormulaCell(ev.detail.value);
            }
        }
    })

    document.addEventListener("keydown",(ev)=>{
        if (ev.key === "Escape")
        {
            this.change_nodeSelector(false);
            this.args = null;
        }
    })

    let frag = document.createDocumentFragment();

    this.FUNCTIONS.forEach((fn)=>{
        let div = document.createElement("div");
        div.className = "excel_formula--list_item";
        
        div.textContent = fn.displayName;
        div.title = fn.docs;

        div.onclick = (ev)=>{
            fn.click_fn(this, fn.formula_name, ev);
            //so we dont lose focus of the input
            ev.preventDefault();
        };

        div.onmousedown = (ev)=>{
            ev.preventDefault();
        }

        frag.appendChild(div);
    })

    this.list.appendChild(frag);

    this.input.addEventListener("input",()=>{
        if (this.input.innerText.length == 0)
        {
            this.input.classList.add("empty");
        }
        else{
            this.input.classList.remove("empty");
        }
    })
}

formula_maker.prototype.MIN = function(...args){
    let sanitizedArgs = [];
    
    args.forEach((arg)=>{
        sanitizedArgs.push(parseFloat(this.excelTable.getCellValueByCoords(arg)));
    })
    let min = Math.min(...sanitizedArgs);
    return min;
}

formula_maker.prototype.SUM = function(...args){
    let sanitizedArgs = [];
    
    args.forEach((arg)=>{
        sanitizedArgs.push(parseFloat(this.excelTable.getCellValueByCoords(arg)));
    })
    let sum = 0;
    
    for (const elem of sanitizedArgs)
    {
        sum += elem;
    }
    return sum;
}

formula_maker.prototype.sumClick = function(context, fn_name, event)
{
    if (document.activeElement == context.input)
    {
        context.input.classList.remove("empty");
        //we should check if we clicked inside the args
        if (context.args == null || context.args == undefined)
            {
                context.insertAt(context.createFuncNode(fn_name))
            }
        else{
            context.addInsideFunction(fn_name);
        }
    } 
}   

formula_maker.prototype.minClick = function(context, fn_name, event)
{
    if (document.activeElement == context.input)
    {
        context.input.classList.remove("empty");
        //we should check if we clicked inside the args
        if (context.args == null || context.args == undefined)
            {
                context.insertAt(context.createFuncNode(fn_name))
            }
        else{
            context.addInsideFunction(fn_name);
        }
    } 
}   

formula_maker.prototype.createFuncNode = function(func_name)
{
    let func = document.createElement("func"), args = document.createElement("args");
    func.contentEditable = true;
    args.contentEditable = true;

    func.onclick = ()=>{
        args.click();
        this.cursorAtEndOfNode(args);
    }

    args.onclick = (ev)=>{
        this.clicked_args(args);
        
        ev.stopPropagation();
    }

    args.onmouseover = (ev)=>{
        args.classList.add("hover");
        ev.stopPropagation();
    }

    args.onmouseout = (ev)=>{
        args.classList.remove("hover");
        ev.stopPropagation();
    }

    func.appendChild(document.createTextNode(func_name + "("));
    args.dataset.cellCoords = JSON.stringify([]);
    args.innerText = "Add args";
    func.appendChild(args);
    func.appendChild(document.createTextNode(")"));

    return func;
}

formula_maker.prototype.clicked_args = function(argNode)
{
    this.change_nodeSelector(true);
    this.args = argNode;
    
}

formula_maker.prototype.change_nodeSelector = function (value)
{
    this.nodeSelector = value;
    document.dispatchEvent(nodeSelectorEvent);

    if(value == false)
    {
        //this is done, we can apply the formula to the selected Cell
        let nodes = this.excelTable.getNodesFromSelection();

        if (nodes.length == 0)
        {
            console.log("Please select a cell");
        }
        else{
            //start applying 
            nodes.forEach((node)=>{
                node.dataset.formula = this.generalizeFormulaByRow(this.input.innerText, node.parentNode.dataset.rowNum);
                node.textContent = this.runFormula(this.input.innerText);
            })
        }
    }
}

formula_maker.prototype.insertAt = function(node){
    if (window.getSelection)
    {

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        let space_node = document.createTextNode("\u00A0");
        range.insertNode(space_node);
        range.insertNode(node);

        range.setStartAfter(space_node);
        range.setEndAfter(space_node);

        selection.removeAllRanges();
        selection.addRange(range);
    }
}

formula_maker.prototype.checkCellCoords = function(cellCoords)
{
    //TODO check the cell coords 
    //ask johnny how we wants 
    //one condition should be to select only data from specific rows 

    return true;
}

formula_maker.prototype.addInsideFunction = function(fn_name){

    if (this.args)
    {
        let prevData = this.args.innerHTML;

        if (prevData == "Add args")
            {
                this.args.innerHTML = "";
                this.args.appendChild(this.createFuncNode(fn_name));
            }
        else{
            //append 
            this.args.innerHTML += ", ";
            this.args.appendChild(this.createFuncNode(fn_name))
        }
    }
}

formula_maker.prototype.addFormulaCell = function(cellCoords)
{
    let prev_cellCoords = this.args.innerHTML;

    if (this.checkCellCoords(cellCoords) && prev_cellCoords.indexOf(cellCoords) === -1){
        
        prev_cellCoords == "Add args" ? prev_cellCoords = prev_cellCoords.replace("Add args", "") : "";

        this.args.innerHTML = prev_cellCoords + (prev_cellCoords!= "" ? ", " : "") + cellCoords;
    }
}

formula_maker.prototype.overwriteFormulaCell = function(cellCoords)
{
    if (this.checkCellCoords(cellCoords))
    {
        this.args.innerHTML = cellCoords;
    }
}

formula_maker.prototype.quoteArgs = function (input, fnNames)
{
    //build the array 
    let words = input.split(/(\(|\)|\,)/);
    let response = "", index = 0;
    
    words.map(word => {

    if (word.trim() == "")
        return ;

    if (input.charAt(index) == ",")
        response += ", ";
    else if (input.charAt(index) == "(" || input.charAt(index) == ")")
        response += input.charAt(index);
    else
        {
            //check if the word is in fnNames 
            if (fnNames.indexOf(word.toUpperCase().trim()) != -1)
            {
                //this is a function, then just add it
                response += word;
            }
            else{
                //this is an argument most probably 
                response += `'${word.trim()}'`;
            }
        }

        index += word.length;

    });

    return response;

}

formula_maker.prototype.runFormula = function(formulaString = null, rowIndex = null)
{
    let formula = formulaString || this.input.innerText;
    const argumentArray = formula.match(/\(([^)]+)\)/);

        if (argumentArray) {
         
        const fnNames = [];
        this.FUNCTIONS.forEach((fn)=>{
            fnNames.push(fn.formula_name);
        })

        let result = this.quoteArgs(formula, fnNames);

        console.log(result);
        //start replacing 
        const pattern = new RegExp(fnNames.join('|'), 'g');
        const replacedFormula = result.replace(pattern, (match) => `this.${match}`);

        console.log(replacedFormula);
        //trick 
        let res = function (form){ 
            return eval(form);
        }.call(this, replacedFormula);
        
        this.input.innerHTML = "";
        this.input.classList.add("empty");
        return res;
    } else {
        console.log("No valid arguments found in the function call.");
        }
}

formula_maker.prototype.copiedFormula = function(formula, target)
{
    console.log(target);
    //start replacing 
    const pattern = new RegExp("\\$[0-9]*", 'g');
    const replacedFormula = formula.replace(pattern, (match) => `$${target.parentNode.dataset.rowNum}`);

    this.excelTable.getNodesFromSelection().forEach((cellNode)=>{
        cellNode.innerText = this.runFormula(replacedFormula);
    });

    target.dataset.formula = replacedFormula;

}

formula_maker.prototype.showFormula = function (cells)
{
    if (cells.length == 1 && cells[0].dataset.formula != "")
    {
        let textFormula = cells[0].dataset.formula;

        console.log(textFormula);
    }
}

formula_maker.prototype.generalizeFormulaByRow = function (formula, startRow)
{
    formula = formula.replace(/\$(\d+)@(\w+)/g, (match, row, col)=>{
        let diff = parseInt(row) - startRow;

        return `$X${diff > 0 ? ("+" + diff) : ("-" + Math.abs(diff))}@${col}`;
    })
    return formula;
}

formula_maker.prototype.compileGeneralizedFormula = function (formula, currentRow)
{
    //get the math expression 
    formula = formula.replace(/\$X(\-|\+)(\d+)@/g,(match, sign, number)=>{

        let result = eval(`${currentRow} ${sign} ${number}`);
        return `$${result}@`;

    })

    return formula;
}