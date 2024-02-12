function data_info(){
    //init
    this.info_node = document.createElement("div");
    this.info_node.className = "data_info--info";
    document.body.appendChild(this.info_node);
    this.info_node.textContent = "";

    document.body.addEventListener("mouseover",(ev)=>{
        let node = this.parentSearch(ev.target);
        
        if (node !== null){
            let rect = node.getBoundingClientRect();
            
            //calculate the position 
            
            this.info_node.style.left = `${rect.x + window.scrollX}px`;
            this.info_node.textContent = node.dataset.info;

            //check  if we have space under 
            let topPos = Math.ceil(rect.bottom + 2 + this.info_node.clientHeight) ;

            if (topPos > document.body.clientHeight)
            {
                //show above
                console.log("above");
                this.info_node.style.top = `${rect.y + window.scrollY - rect.height}px`
            }else{
                //we have place under 
                console.log("below");
                this.info_node.style.top = `${topPos + window.scrollY - this.info_node.clientHeight}px`;
            }

            this.info_node.classList.add("vis");

        }else{
            this.info_node.classList.remove("vis");
        }
    })

}

data_info.prototype.parentSearch = function (node)
{
    if (node?.classList?.contains("data_info"))
    {
        return node;
    }

    if (node.parentElement.tagName !== "BODY")
    {
        return this.parentSearch(node.parentElement);
    }

    return null;
}