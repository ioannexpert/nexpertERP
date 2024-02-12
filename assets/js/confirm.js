
const windowTemplate = `
<div class = 'confirm--window' id = 'confirm_window'>
    <div class = 'confirm--header'>
        <span>Confirmation</span>
        <i class = 'fa-regular fa-square-x static' data-for='close'></i>
    </div>

    <div class = 'confirm--body'>
    
    </div>

    <div class = 'confirm--footer'>
        <button class = 'cancel_button' id = 'confirm_cancel'><i class = 'fa-regular fa-xmark'></i> Cancel</button>
        <button class = 'submit_button' id = 'confirm_submit'><i class = 'fa-regular fa-check'></i> Submit</button>
    </div>
</div>
`

function Confirm(title, view = [], cb_cancel = {context_cancel: undefined, fn: undefined, params: undefined}, cb_submit = {context_submit: undefined, fn: undefined, params: undefined})
{
    this.cb_cancel = cb_cancel;
    this.cb_submit = cb_submit;
    this.init(); 
    this.setListeners();
    this.setTitle(title);
    this.setBody(view);
}

Confirm.prototype.init = function(){
    if (document.querySelector("#confirm_background") && document.querySelector("#confirm_window"))
    {
        this.open();
        return ;
    }

    let background = document.createElement("div");
    background.className = "confirm--background";
    background.id = "confirm_background";

    let windowNode = document.createRange().createContextualFragment(windowTemplate);

    windowNode.querySelector(".confirm--header i").onclick = ()=>{
        if (this.cb_cancel.context_cancel)
        {
            this.cb_cancel.fn.apply(this.cb_cancel.context_cancel, this.cb_cancel.params);
        }else if (this.cb_cancel.fn){
            this.cb_cancel.fn();
        }

        document.querySelector("#confirm_background").classList.toggle("open");
        if (!this.isOpened())
            document.querySelector("body").classList.remove("modal");

    }

    background.appendChild(windowNode);
    document.querySelector("body").appendChild(background);
    this.open();
}

Confirm.prototype.setListeners = function()
{
    document.querySelector("#confirm_submit").onclick = ()=>{
        this.cb_submit.params.push(this);
        
        if (this.cb_submit.context_submit)
        {
            this.cb_submit.fn.apply(this.cb_submit.context_submit, this.cb_submit.params);
        }else{
            this.cb_submit.fn(...this.cb_submit.params);
        }   
    }

    document.querySelector("#confirm_cancel").onclick = ()=>{
        if (this.cb_cancel.context_cancel)
        {
            this.cb_cancel.fn.apply(this.cb_cancel.context_cancel, this.cb_cancel.params);
        }else if (this.cb_cancel.fn){
            this.cb_cancel.fn();
        }
        this.open();
    }
}

Confirm.prototype.setTitle = function(title)
{
    document.querySelector("#confirm_window .confirm--header span").textContent = title;
}

Confirm.prototype.open = function(){
    document.querySelector("#confirm_background").classList.toggle("open");
    if (this.isOpened())
    {
        document.querySelector("body").classList.add("modal");
    }else{
        document.querySelector("body").classList.remove("modal");
    }
}

Confirm.prototype.isOpened = function(){
    if (document.querySelector("#confirm_background.open"))
        return true;

        return false;
}

Confirm.prototype.setBody = function (viewNode)
{
    let body = document.querySelector("#confirm_window .confirm--body");
    body.innerHTML = "";
    if (viewNode instanceof Array)
    {
        viewNode.forEach((node)=>{
            body.appendChild(node);
        })
    }else
    body.appendChild(viewNode);

}