const nodeSelectorEvent = document.createEvent("HTMLEvents");
nodeSelectorEvent.initEvent("nodeSelector_change", true, true);

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
        }
    ];
}

formula_maker.prototype.bindTable = function(context){
    this.excelTable = context;
}

formula_maker.prototype.init_fns = function(){

    this.input.classList.add("disabled");

    document.querySelector(".formula_apply").onclick = ()=>{
        this.change_nodeSelector(false);
    }

    document.addEventListener("keydown",(ev)=>{
        this.ctrlKey = ev.ctrlKey;
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
            this.input.classList.remove("disabled");
        }

        if (this.args !== null)
        {
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
            console.log("TODO HERE ")
        }
    } 
}   

formula_maker.prototype.createFuncNode = function(func_name)
{
    let func = document.createElement("func"), args = document.createElement("args");
    func.contentEditable = true;
    args.contentEditable = true;

    args.onclick = (ev)=>{
        ev.stopPropagation();
        console.log("We clicked");
        console.log(args);
        this.clicked_args(args);
    }

    func.appendChild(document.createTextNode(func_name + "("));
    args.dataset.cellCoords = JSON.stringify([]);
    args.innerHTML = "Add args";
    func.appendChild(args);
    func.appendChild(document.createTextNode(")"));

    return func;
}

formula_maker.prototype.clicked_args = function(argNode)
{
    console.log("Now we can select data");
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
                node.dataset.formula = this.input.innerText;
                node.textContent = this.runFormula(this.input.innerText);
            })
        }
    }
}

formula_maker.prototype.insertAt = function(node){
    if (document.getSelection)
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

formula_maker.prototype.addFormulaCell = function(cellCoords)
{
    let prev_cellCoords = JSON.parse(this.args.dataset.cellCoords);

    if (this.checkCellCoords(cellCoords) && prev_cellCoords.indexOf(cellCoords) === -1){
        prev_cellCoords.push(cellCoords);
        this.args.dataset.cellCoords = JSON.stringify(prev_cellCoords);
        this.args.innerText = prev_cellCoords.join(", ");
    }
}

formula_maker.prototype.overwriteFormulaCell = function(cellCoords)
{
    let cellCoords_arr = [];
    cellCoords_arr.push(cellCoords);

    if (this.checkCellCoords(cellCoords))
    {
        this.args.dataset.cellCoords = JSON.stringify(cellCoords_arr);
        this.args.innerText = cellCoords_arr.join(", ");
    }
}

formula_maker.prototype.runFormula = function(formulaString = null, rowIndex = null)
{
    let formula = formulaString || this.input.innerText;
    const argumentArray = formula.match(/\(([^)]+)\)/);

        if (argumentArray) {
        const arguments = argumentArray[1].split(',').map(arg => arg.trim());
        const quotedArguments = arguments.map(arg => `'${arg}'`).join(', ');
        let result = formula.replace(/\([^)]+\)/, `(${quotedArguments})`);

        //now replace the functionNames with this.fnName 
        const fnNames = [];
        this.FUNCTIONS.forEach((fn)=>{
            fnNames.push(fn.formula_name);
        })

        //start replacing 
        const pattern = new RegExp(fnNames.join('|'), 'g');
        const replacedFormula = result.replace(pattern, (match) => `this.${match}`);

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