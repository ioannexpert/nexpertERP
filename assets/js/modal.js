let modal_temp = `
<div class = 'modal_window'>
    <div class = 'modal--header'>
    <button class = 'primary_button'><i class = 'fa-regular fa-chevron-left'></i> Back </button>

    <span> Titlu fereastra </span>
    <i class = 'fa-regular fa-square-xmark' data-for='close'></i>
    </div>
    <div class = 'modal--body_container'>
        <div class = 'modal--body'>
            <div class = 'modal--page'>
                Unu
            </div>
            <div class = 'modal--page'>
                Doi
            </div>
        </div>
    </div>
</div>
`;

function modal()
{
    this.background = null;
    this.node = null;
    this.history = [];
    this.currentIndex = 0;

    this.init();
}

modal.prototype.init = function (){
    this.background = document.createElement("div");
    this.background.className = "modal--background";

    this.node = document.createRange().createContextualFragment(modal_temp).children[0];
    
    this.node.querySelector(".modal--header button").onclick = ()=>{
        this.go_back();
    }
    this.node.querySelector(".modal--header i[data-for='close']").onclick = ()=>{
        this.close();
    }

    this.background.appendChild(this.node);
    
    document.body.appendChild(this.background);
}

modal.prototype.close = function(){
    this.clear();
    this.background.classList.remove("open");
}

modal.prototype.open = function(){
    this.background.classList.add("open");
}

modal.prototype.clear = function(){
    //remove all the modal--page
    Array.from(this.node.querySelectorAll(".modal--page")).forEach((node)=>{
        node.remove();
    })
    this.history = [];
    this.currentIndex = 0;
    this.update_header("");
}

modal.prototype.update_header = function(title)
{
    this.node.querySelector(".modal--header span").textContent = title;
    if (this.history.length > 1)
    {
        this.node.querySelector(".modal--header button").style.display = "block";
    }else{
        this.node.querySelector(".modal--header button").style.display = "none";
    }
}

modal.prototype.createPage = function(node)
{
    let page = document.createElement("div");
    page.className = "modal--page";
    page.appendChild(node);

    return page; 
}

modal.prototype.pushView = function (node, title)
{
    //push the node, then animte to it 
    this.node.querySelector(".modal--body").appendChild(this.createPage(node));
    
    this.history.push({
        title,
        node
    });
    this.currentIndex++;
    this.showView();
}

modal.prototype.setView = function (node, title){
    this.clear();
    this.pushView(node, title);
}

modal.prototype.showView = function(){
    this.node.querySelector(".modal--body").style.transform = `translateX(calc(-${100 * (this.currentIndex - 1) }% + ${(this.currentIndex - 1) * 10 * 2}px))`;
    this.update_header(this.history[this.currentIndex - 1].title);
}

modal.prototype.go_back = function()
{
    if (this.currentIndex <= 1)
    return ;

    let {node} = this.history.pop();
    this.currentIndex--;
    this.showView();
    setTimeout(()=>{
        node.parentNode.remove();
    }, 400);   
}

