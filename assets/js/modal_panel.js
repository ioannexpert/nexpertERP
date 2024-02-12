function modal_panel()
{
    this.history = [];
    this.currentIndex = 0;
    //create the container 
    this.container = document.createElement("div");
    this.container.className = "modal_panel--container";

    this.body = document.createElement("div");
    this.body.className = "modal_panel--body right";

    //append the header and the body_content 
    let [header, content, content_container] = [document.createRange().createContextualFragment(`        <div class="modal_panel--body_header">
    <button class="primary_button small"><i class="fa-solid fa-arrow-left"></i> Back</button> <span>Salut</span> <button class="cancel_button small"><i class="fa-solid fa-square-xmark"></i></button>
</div>`), document.createElement("div"), document.createElement("div")];

    header.querySelector(".primary_button").onclick = ()=>{
        this.go_back();
    }
    
    header.querySelector(".cancel_button").onclick = ()=>{
        this.close();
    }
    content_container.className = "modal_panel--body_content_container";
    content_container.appendChild(content);
    content.className = "modal_panel--body_content";


    this.body.appendChild(header.children[0]);
    this.body.appendChild(content_container);

    this.container.appendChild(this.body);

    document.body.appendChild(this.container);
}

modal_panel.prototype.close = function(){
    this.clear();
    this.container.classList.remove("open");
}

modal_panel.prototype.open = function(direction = "right"){
    this.body.className = "modal_panel--body "+direction;
    this.container.classList.add("open");
}

modal_panel.prototype.clear = function(){
    //remove all the modal_panel--page
    Array.from(this.container.querySelectorAll(".modal_panel--page")).forEach((node)=>{
        node.remove();
    })
    this.history = [];
    this.currentIndex = 0;
    this.update_header("");
}

modal_panel.prototype.update_header = function(title)
{
    this.container.querySelector(".modal_panel--body_header span").textContent = title;
    if (this.history.length > 1)
    {
        this.container.querySelector(".modal_panel--body_header").classList.add("back");
    }else{
        this.container.querySelector(".modal_panel--body_header").classList.remove("back");
    }
}

modal_panel.prototype.createPage = function(node)
{
    let page = document.createElement("div");
    page.className = "modal_panel--page";
    page.appendChild(node);

    return page; 
}

modal_panel.prototype.pushView = function (node, title)
{
    //push the node, then animte to it 
    this.container.querySelector(".modal_panel--body_content").appendChild(this.createPage(node));
    
    this.history.push({
        title,
        node
    });
    this.currentIndex++;
    this.showView();
}

modal_panel.prototype.setView = function (node, title){
    this.clear();
    this.pushView(node, title);
}

modal_panel.prototype.showView = function(){
    this.container.querySelector(".modal_panel--body_content").style.transform = `translateX(calc(-${100 * (this.currentIndex - 1) }% - ${(this.currentIndex - 1) * 10 * 2 + 3}px))`;
    this.update_header(this.history[this.currentIndex - 1].title);
}

modal_panel.prototype.go_back = function()
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

