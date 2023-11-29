
function toggle_actions(elem, ev)
{
  ev.preventDefault();
  
  let groupItem = elem.parentElement.parentElement;
  groupItem.classList.toggle("active");

}

function toggle_doc_form(elem)
{
  elem.parentElement.querySelector(".add_doc--form_container").classList.toggle("open");
}

function submit_add_doc(elem){
  let colors = elem.parentElement.querySelectorAll("[name='doc_color']");
  let page_id = elem.parentElement.parentElement.parentElement.parentElement.parentElement.dataset.id;

  let color = "";
  Array.from(colors).forEach((node)=>{
    if (node.checked){
      color = node;
    }
  });

  let name = document.querySelector("#doc_name").value;

  $.ajax({
    url: "/document/add_document",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({"color": color.value, name, page_id}),
    success: function(data){
      //append the menu Node 
      let node = document.querySelector("#sheetMenu").content.cloneNode(true);

      node.querySelector("a").href = "/document/"+data.data.pageName+"/"+name;
      node.querySelector("span").textContent = name;
      node.querySelector("i").style.color = color.value;
      node.querySelector(".actions_list").dataset.id = data.data._id;

      node.querySelector(".actions_list .action.danger").onclick = ()=>{
        delete_doc(data.data._id, name);
      };
      node.querySelector(".actions_list .action.primary").onclick = ()=>{
        rename_doc(data.data._id, name)
      };
      
      elem.parentElement.parentElement.parentElement.querySelector(".menu_group--list").appendChild(node);

      document.querySelector("#doc_name").value = "New document";
      color.checked = false;
      console.log(elem);
      toggle_doc_form(elem.parentElement.parentElement);

    },error: function(err){
        Toastify({
          className: "toast_error",
          text: err.responseJSON?.body || "Couldn't add the document"
        }).showToast();
    }
  })
}

function delete_doc(doc_id, doc_name)
{
  let cb = {
    context: null,
    fn: delete_doc_request,
    params: [doc_id]
  }
  new Confirm("Delete document", document.createTextNode(`Are you sure you want to remove document ${doc_name}`), {}, cb);

}

function delete_doc_request(doc_id, confirm)
{
  confirm && confirm.open();
  
    $.ajax({
      url: "/excel/remove_document",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({doc_id}),
      success: function(){
        document.querySelector(`.actions_list[data-id='${doc_id}']`).parentElement.parentElement.remove();
        Toastify({
          className: "toast_success",
          text: "The document was removed"
        }).showToast();
      },error: function(){
        Toastify({
          className: "toast_error",
          text: "The document was not removed"
        }).showToast();
      }
    })
}

function rename_doc(doc_id, doc_name)
{
  let input = new DynamicNodes().input("New document name", "Name", doc_name,"","","",{"margin-top":"10px"});

  let cb = {
    context: null,
    fn: rename_doc_request,
    params: [doc_id, input]
  }
  new Confirm("Rename document", [document.createTextNode(`Are you sure you want to rename document ${doc_name} to: `), input], {}, cb);
}

function rename_doc_request(doc_id, input_name, confirm)
{
  confirm && confirm.open();

  console.log(doc_id);
  console.log(input_name.querySelector("input").value);

  $.ajax({
    url: "/excel/rename_document",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({doc_id, name: input_name.querySelector("input").value}),
    success: function(){

        Toastify({
          className: "toast_success",
          text: "The document was renamed"
        }).showToast();

        let node = document.querySelector(`.actions_list[data-id='${doc_id}']`).parentElement.parentElement;
        node.querySelector(".action.primary").onclick = ()=>{
          rename_doc(doc_id, input_name.querySelector("input").value);
        }
        console.log(node);
        node.querySelector("span").textContent = input_name.querySelector("input").value;

    },error: function(){
      Toastify({
        className: "toast_error",
        text: "The document was not renamed"
      }).showToast();
    }
  })
}

function show_page(elem)
{
  let page = elem.parentElement.parentElement;
  page.querySelector(".menu_page--content_container").classList.toggle("open");
}

function toggle_add_page()
{
  document.querySelector(".add_page--container").classList.toggle("open");
}

function add_page()
{
  let page_icons = document.querySelectorAll(".add_page--form input[name='page_icon']");
  let icon = null;

  Array.from(page_icons).forEach((elem)=>{
    if (elem.checked === true)
    {
      icon = elem.value;
    }
  })
  let pageName = document.querySelector("#page_name").value;

  $.ajax({
    url: "/document/add_page",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({pageName, icon}),
    success: function (data)
    {
      if (data?.success === true)
      { 
        //add the node 
        let temp = document.querySelector("#page_container").content.cloneNode(true);
        temp.querySelector(".menu_page--documents").dataset.id = data._id;
        temp.querySelector(".icon_holder i").className = icon;
        temp.querySelector(".page_link").textContent = pageName;
        temp.querySelector(".page_link").href = "/document/"+pageName;

        document.querySelector(".menu").insertBefore(temp, document.querySelector(".add_page--container"));
        page_icons[1].checked = true;
        document.querySelector("#page_name").value = "New page";
        toggle_add_page();
      }else{
        Toastify({
          className: "toast_error",
          text: "Page was not added!"
        }).showToast();
      }
    },error: (response)=>{
      Toastify({
        className: "toast_error",
        text: response?.responseJSON.body || "Page was not added!"
      }).showToast();
    }
  })
}