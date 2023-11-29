$(function(){
    parse_docs();
});

function parse_docs()
{
    $.ajax({
        url: "/document/get_documents",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({page_id: document.querySelector("#page_id").value}),
        success: function(data){
            if (data?.success === true)
            {
                console.log(data);
               //put the nodes 
               let frag = document.createDocumentFragment();

               data.data.forEach((doc)=>{
                let node = document.querySelector("#document").content.cloneNode(true);
                node.querySelector(".document--header").href = `/document/${data.pageName}/${doc.name}`;
                node.querySelector(".document--header span").textContent = doc.name;
                node.querySelector(".document--header").style = `--color: ${doc.color}`;

                if (doc?.sheets && doc.sheets.length != 0)
                {
                    //loop
                    doc.sheets.forEach((sheet)=>{

                        let sheetNode = document.createElement("a");
                        sheetNode.className = "document--sheet";
                        sheetNode.href = `/document/${data.pageName}/${doc.name}?sheet=${sheet.sheetName}`;
                        sheetNode.textContent = sheet.sheetName;

                        node.querySelector(".document--sheets").appendChild(sheetNode);
                    })
                }else{
                    node.querySelector(".document--sheets").appendChild(document.createTextNode("No sheets"))
                }

                frag.appendChild(node);
               })

               document.querySelector(".documents_container").appendChild(frag);
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Unexpected error"
                }).showToast();
            }
        },error: function(){
                Toastify({
                    className: "toast_error",
                    text: "Unexpected error"
                }).showToast();
        }
    })
}