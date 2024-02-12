var custom_select;

$(function() {
    parse_sheets();

    window.dn = new DynamicNodes();

    document.querySelector("#konva canvas").addEventListener("dragover",(e)=>{
        e.preventDefault();
        return false;
    })

    document.querySelector("#konva canvas").addEventListener("drop",(e)=>{
        //hide the dropped one 
        document.querySelector(".dragging").classList.add("dropped");
        let dropData = JSON.parse(e.dataTransfer.getData("text"));
        let cols = get_sheet_columns(dropData._id);

        cols.then((data)=>{
            let sheet_id = dropData._id;
            layer.add(sheet(dropData.name, data, sheet_id));
            
            //append to the general list
            let li = document.createElement("li");
            li.dataset.sheet_id = sheet_id;
            let b = document.createElement("b");
            b.textContent = dropData.name;
            li.appendChild(b);
            li.appendChild(document.createTextNode(" from "+dropData.document));

            li.onclick = ()=>{
                //focus the group with this id 
                for (let sheet_group of sheet_groups){
                    if (sheet_group.id == sheet_id)
                    {
                        focus_sheet(sheet_group, sheet_group.children[0]);
                    }
                }
            }
            
            document.querySelector(".konva_menu--body_page#general ul").appendChild(li);

            check_for_relations(get_sheets_from_report(), sheet_id);
        })
    })
});

function check_for_relations(previous, current){
    previous[previous.indexOf(current)] = null;

    $.ajax({
        url: "/reporting/smart_relations",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({previous, current}),
        success: (data)=>{
            if (data?.success === true){
                let relations = data.data;

                if (relations)
                {
                    for (const relation of relations){
                        drawLine(get_column_shape_by_id(relation[0]), get_column_shape_by_id(relation[1]))
                    }

                    Toastify({
                        className: "toast_success",
                        text: "Smart relation detection inserted the connections!"
                    }).showToast();
                }
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Relations detection error!"
                }).showToast();
            }
        },error: ()=>{
            Toastify({
                className: "toast_error",
                text: "There was an error while checking for relations between columns!"
            }).showToast();
        }
    })
}

function get_sheets_from_report(banned = []){
    let arr = [];

    stage.children[0].children.forEach((child)=>{
        if (child.shapeType == "sheet"){
            if (banned.indexOf(child.id) == -1){
                arr.push(child.id);
            }
        }
    })

    return arr;
}

function parse_sheets(){
    $.ajax({
        url: "/excel/get_all_sheets",
        type: "POST",
        contentType: "application/json",
        success: function(data){
            if (data?.success === true){
                data = data.data;
                let frag = document.createDocumentFragment();

                data.forEach((sheet)=>{
                    let doc_elem = frag.querySelector(`.sheets--document[data-doc_id = '${sheet.document._id}']`);
                    if (doc_elem == null)
                    {
                        //create the doc_elem
                        doc_elem = document.createElement("div");
                        doc_elem.className = 'sheets--document';
                        doc_elem.dataset.doc_id = sheet.document._id;

                        let span = document.createElement("span");
                        span.textContent = `${sheet.page.pageName} - ${sheet.document.name}`;
                        doc_elem.appendChild(span);

                        let content = document.createElement("div");
                        content.className = "sheets--document_content";
                        doc_elem.appendChild(content);
                        frag.appendChild(doc_elem);
                    }

                    //create the sheet now and append
                    let sheet_span = document.createElement("span");
                    sheet_span.dataset._id = sheet._id;
                    sheet_span.textContent = sheet.sheetName;
                    sheet_span.draggable = true;
                    console.log(sheet);
                    sheet_span.addEventListener("dragstart",(e)=>{
                        var img = document.createElement("img");   
                        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        
                        // Set the custom drag image
                        e.dataTransfer.setDragImage(img, 0, 0);

                        e.dataTransfer.clearData();
                        e.dataTransfer.setData("text/plain", JSON.stringify({_id: e.target.dataset._id, name: sheet.sheetName, document: sheet.document.name}));


                        //hide the target 
                        e.target.classList.add("dragging");
                        //start moveing the elements from the right 
                        let spans = sheet_span.parentElement.querySelectorAll("span");
                        let start_index = Array.from(spans).indexOf(e.target);

                        for (let index = start_index + 1;index < spans.length; index++){
                            
                            //translate to the previous 
                            spans[index].style.transform = `translateX(-${spans[start_index].getBoundingClientRect().width}px)`;

                        }

                    })

                    sheet_span.addEventListener("dragend",(e)=>{
                        e.preventDefault();
                        e.target.classList.remove("dragging");
                        //remove translateX for all nodex 
                        let spans = e.target.parentElement.querySelectorAll("span");
                        Array.from(spans).forEach((span)=>{
                            span.style.transform = "translateX(0px)";
                        })
                    })

                    //custom drag and drop
                   

                    doc_elem.querySelector(".sheets--document_content").appendChild(sheet_span);
                })

                document.querySelector(".sheets--container_body").appendChild(frag);
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Error parsing sheets!"
                }).showToast();
            }
        },error: ()=>{
            Toastify({
                className: "toast_error",
                text: "Error parsing sheets!"
            }).showToast();
        }
    })
}


function get_sheet_columns(sheet_id){
    return new Promise((res, rej)=>{
        $.ajax({
            url: "/excel/get_header",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({sheetId: sheet_id}),
            success: function(data){
                res(data);
            },error: ()=>{
                rej();
                Toastify({
                    className: "toast_error",
                    text: "Error parsing sheet data!"
                }).showToast();
            }
        })
    })
}

function zoom_konva_out(){
    if (stage !== undefined){
        //get the zoom value now, then add 
        let zoom_value = parseInt(document.querySelector("#zoom_value").value);
        zoom_value -= 10;
        zoom_value /= 100;
        
        stage.setScaleX(zoom_value);
        stage.setScaleY(zoom_value);
        
        document.querySelector("#zoom_value").value = parseInt(zoom_value*100);
    }
}

function zoom_konva_in(){
    if (stage !== undefined){
        //get the zoom value now, then add 
        let zoom_value = parseInt(document.querySelector("#zoom_value").value);
        zoom_value += 10;
        zoom_value /= 100;
        
        stage.setScaleX(zoom_value);
        stage.setScaleY(zoom_value);
        
        document.querySelector("#zoom_value").value = parseInt(zoom_value*100);
    }
}

function save_button(confirmed = false, label, confirm){

    let input = window.dn.input("Name");
    let cb_submit = {
        context_submit: undefined,
        fn: save_button,
        params: [true, input]
    };

    new Confirm("Save diagram", window.dn.frag(document.createTextNode("Give a name for this diagram!"), input) ,{}, cb_submit);

    if (confirmed){
        let sheets_included = [];

        Array.from(document.querySelectorAll(".konva_menu--body_page#general ul li")).forEach((li)=>{
            sheets_included.push(li.dataset.sheet_id);
        })
        
        $.ajax({
            url: "/reporting/save_diagram",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({json: stage.toJSON(), name: label.querySelector("input").value, image: stage.toDataURL({ pixelRatio: .2 }), sheets_included}),
            success: (data)=>{
                if (data?.success == true)
                    Toastify({
                        className: "toast_success",
                        text: "The diagram was saved!"
                    }).showToast();
                else{
                    confirm.open();
                    Toastify({
                        className: "toast_error",
                        text: data?.body || "Unexpected error!"
                    }).showToast();
                }
            }, error: ()=>{
                Toastify({
                    className: "toast_error",
                    text: "Could not save the diagram!"
                }).showToast();
            }
        })
    }
}

function show_diagrams(){
    if (modalLib !== undefined){
        
        let parent = window.dn.div("saved_diagrams--container",{});
        modalLib.setView(parent, "Saved diagrams");
        load_saved_diagrams(parent);
        modalLib.open();
    }
}

function load_saved_diagrams(parent){
    console.log(parent);

    $.ajax({
        url: "/reporting/get_diagrams",
        type: "GET",
        contentType: "application/json",
        success: (data)=>{
            if (data.diagram_response?.success === true && data.users?.success === true){
                
                let frag = document.createDocumentFragment();
                let diagrams = data.diagram_response.data;
                let users = data.users.data;

                const getUsername_byId = (user_id)=>{
                    for (let user of users){
                        console.log(user);
                        if (user.id == user_id)
                        return user.name;
                    }
                }

                diagrams.forEach((diagram)=>{
                    let node = document.querySelector("#diagram_node").content.cloneNode(true);
                    node.querySelector("diagram_name").textContent = diagram.name;
                    node.querySelector(".diagram_container--title span").textContent = " created by "+getUsername_byId(diagram.user_id);
                    node.querySelector("img").src = diagram.image;

                    diagram.sheets_names.forEach((sheet_name)=>{
                        let sheet_node = document.createElement("div");
                        sheet_node.className = "diagram_container--sheet";
                        sheet_node.textContent = sheet_name;
                        node.querySelector(".diagram_container--list").appendChild(sheet_node);
                    })   


                    frag.appendChild(node);
                })
                parent.appendChild(frag);
            }else{
                Toastify({
                    className: "toast_error",
                    text: "Could not load the diagrams!"
                }).showToast();
            }
        }, error: ()=>{
            Toastify({
                className: "toast_error",
                text: "Could not load the diagrams!"
            }).showToast();
        }
    })
}

function switch_to_view(view_name){
    toggle_step(view_name);

    let pages = document.querySelectorAll(".reporting_page");

    Array.from(pages).forEach((page)=>{
        if (page.id == view_name){
            page.classList.remove("hidden");
        }else{
            page.classList.add("hidden");
        }
    });

    populate_type_one(document.querySelector(".reporting_card.type_one"));
    populate_type_two(document.querySelector(".reporting_card.type_two"));
}

function get_relation_sheet_names(){
    let relation_groups = [];
    let group_ids = [];

    lines.forEach((relation)=>{
        let start_id = relation.start.parent.id;
        let end_id = relation.end.parent.id;
        
        group_ids.push(start_id);
        group_ids.push(end_id);
        let found = false;
        //search for end | start in relation_groups
        relation_groups.forEach((relation_group)=>{
            if (relation_group.indexOf(start_id) !== -1  || relation_group.indexOf(end_id) !== -1){
                found = true;
                //we found th group 
                if (relation_group.indexOf(start_id) == -1){
                    relation_group.push(end_id);
                }else{
                    relation_group.push(start_id);
                }
            }
        })

        if (!found){
            relation_groups.push([start_id, end_id]);
        }
    })
    
    return {relation_groups, group_ids};
}

function get_relations(sheets){
    //we should get all the relations for these tables 
    //relations array will contain the uuid's of the columns that need to be equal with the other 
    let relations = {};

    lines.forEach((line_obj)=>{
        console.log(line_obj);
        let sheet_id1 = line_obj.start.parent.id;
        let sheet_id2 = line_obj.end.parent.id;

        if (sheets.indexOf(sheet_id1) != -1 && sheets.indexOf(sheet_id2) != -1)
        {
            //this means that the relation between these 2 sheets is important for us right now
            //we see relations as a undirected graph, so basically we are building the adj mastrix now

            if (relations[sheet_id1] === undefined){

                relations[sheet_id1] = {};
                relations[sheet_id1][sheet_id2] = [];

            }else if (relations[sheet_id1][sheet_id2] === undefined){
                relations[sheet_id1][sheet_id2] = [];
            }

            if (relations[sheet_id2] === undefined){
                
                relations[sheet_id2] = {};
                relations[sheet_id2][sheet_id1] = [];

            }else if (relations[sheet_id2][sheet_id1] === undefined){
                relations[sheet_id2][sheet_id1] = [];
            }

            relations[sheet_id1][sheet_id2].push([
                line_obj.start.id,
                line_obj.end.id
            ]);

            relations[sheet_id2][sheet_id1].push([
                line_obj.start.id,
                line_obj.end.id
            ])
        }
    })

    return relations;
}

function populate_type_two(node){
    
    let {relation_groups, group_ids} = get_relation_sheet_names();

    const search_sheet_names = (search, elements)=>{
        let response = {};

        search.forEach((sheet)=>{
            if (elements.indexOf(sheet._id) != -1)
            {
                response[sheet._id] = sheet.sheetName;
            }
        })

        return response;
    }

    get_sheet_names(group_ids).then((response)=>{
        let frag = document.createDocumentFragment();
        //populate the custom select for relations
        relation_groups.forEach((relation_group)=>{
            let sheet_names = search_sheet_names(response, relation_group);

            let custom_option_node = document.createElement("customOption");
            custom_option_node.dataset.value = relation_group.join(",");
            custom_option_node.textContent = (()=>{
                let text = "";
                relation_group.forEach((sheet_id)=>{
                    text += `${sheet_names[sheet_id]} - `;
                })
                text = text.substring(0, text.length-2);
                return text;
            })();

            frag.appendChild(custom_option_node);
        })
        let select_node = node.querySelector(".custom_select#relations_select");

        select_node.appendChild(frag);

        if (custom_select === undefined){
            custom_select = new customSelect();
        }

        custom_select.init(select_node, ["reporting_custom_select"], "Relation");

        //init the second select now 
        select_node.addEventListener("customSelect_changed",(ev)=>{
            let sheet_names = search_sheet_names(response, ev.detail.value.split(","));
            //first clear the 
            let frag = document.createDocumentFragment();
            let select_node_main = node.querySelector(".custom_select#table_select");
            //first clear 
            Array.from(select_node_main.children).forEach((child)=>{
                child.remove();
            })

            let selected_sheets = ev.detail.value.split(",");

            selected_sheets.forEach((selected_sheet)=>{
                let customOption = document.createElement("customOption");
                customOption.textContent = sheet_names[selected_sheet];
                customOption.dataset.value = selected_sheet;

                frag.appendChild(customOption);
            })

            select_node_main.appendChild(frag);
            custom_select.init(select_node_main, ["reporting_custom_select"], "Main sheet");
            
            select_node_main.addEventListener("customSelect_changed", (ev)=>{
                let selected_sheetId = ev.detail.value;

                //first get sheet headers and populate them 
                $.ajax({
                    url: '/reporting/get_headers',
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({sheet_id: selected_sheetId}),
                    success: (data)=>{
                        
                        if (data?.success === true){

                            let table_node = node.querySelector(".special_table");
                            table_node.dataset.page = 1;
                            table_node.dataset.for = selected_sheetId;

                            //first refresh the table 
                            Array.from(table_node.querySelectorAll("tr")).forEach((node)=>node.remove());

                            let tr = document.createElement("tr");
                            data.data.forEach((header_object)=>{
                                let td = document.createElement('th');
                                td.dataset.uuid  = header_object.uuid;
                                td.textContent = header_object.name;
                                tr.appendChild(td);
                            })
                            table_node.appendChild(tr);

                            render_sheet_values(table_node, selected_sheetId, selected_sheets, node);
                        }else{
                            Toastify({
                                className: "toast_error",
                                text: "Unexpected error!"
                            }).showToast();
                        }
                    }, error:()=>{
                        Toastify({
                            className: "toast_error",
                            text: "Could not load table headers!"
                        }).showToast();
                    }
                })
            })

            //select the default
            custom_select.selectOption(select_node_main, selected_sheets[0], false);
        })

        custom_select.selectOption(select_node, relation_groups[0].join(","), false);

    }).catch((e)=>{
        console.log(e);
        Toastify({
            className: "toast_error",
            text: "Report error!"
        }).showToast();
    })
}

function render_sheet_values(table_node, sheet_id, relation_sheets, parentNode){

 
    $.ajax({
        url: "/reporting/get_values",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({sheet_id, page: table_node.dataset.page}),
        success: (data)=>{
            if (data?.success === true){
                let frag = document.createDocumentFragment();
                
                let uuids = [];
                Array.from(table_node.querySelector("tr").children).forEach((td)=>{
                    uuids.push(td.dataset.uuid);
                })
                
                console.log(data);

                const search_by_uuid = (where, what)=>{
                    for (const data of where){
                        if (data.uuid == what){
                            return data.value;
                        }
                    }
                    return "";
                }
                data.data.forEach((row)=>{
                    let tr = document.createElement("tr");
                    tr.dataset.rowId = row._id;

                    tr.onclick = ()=>{
                        table_node.querySelector(".active")?.classList.remove("active");
                        tr.classList.add("active");

                        //populate extra's body
                        populate_type_two__relational(relation_sheets, parentNode);
                    }

                    uuids.forEach((uuid)=>{
                        let value = search_by_uuid(row.data, uuid);

                        let td = document.createElement('td');
                        td.textContent = value;
                        tr.appendChild(td);
                    })
                   
                    frag.appendChild(tr);
                })

                table_node.appendChild(frag);
            }
        }, error: ()=>{
            Toastify({
                className: "toast_error",
                text: "Could not load table values!"
            }).showToast();
        }
    })
}

function get_selected_rows(node){
    let selected = {};

    Array.from(node.querySelectorAll(".special_table")).forEach((table_node)=>{
    
        if (table_node.querySelectorAll("tr.active").length != 0){
            selected[table_node.dataset.for] = table_node.querySelector("tr.active").dataset.rowId;
        }
    })

    return selected;
}

function populate_type_two__relational(sheets, node){
    //we should get the selected rows from the table_nodes 
    console.log(node);

    //ajax request 
    $.ajax({
        url: "/reporting/relational_data",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({sheets, relations: get_relations(sheets), selected: get_selected_rows(node)}),
        success: (data)=>{
            
            console.log(data);

        },error: (err)=>{
            Toastify({
                className: "toast_error",
                text: "Unexpected error!"
            }).showToast();
        }
    })

}

function populate_type_one(node){
    //first populate the select options 
    //get the sheet id's 
    let sheet_ids = [];
    stage.children[0].children.forEach((shape)=>{
        if (shape.shapeType == "sheet"){
            sheet_ids.push(shape.id);
        }
    })

    get_sheet_names(sheet_ids).then((response)=>{

        let frag = document.createDocumentFragment();
        let selected = "";
        response.forEach((resp)=>{
            if (selected == ""){
                selected = resp._id;
            }

            let option = document.createElement("customOption");
            option.dataset.value = resp._id;
            option.appendChild(document.createTextNode(resp.sheetName));

            frag.appendChild(option);
        })

        let select_node = node.querySelector(".custom_select");

        select_node.appendChild(frag);

        if (custom_select === undefined)
            custom_select = new customSelect();

        custom_select.init(select_node);

        select_node.addEventListener("customSelect_changed", (event)=>{
            populate_type_one_columns(node, event.detail.value);
        });

        custom_select.selectOption(select_node, selected, false);   

    }).catch((e)=>{
        console.log(e);
        Toastify({
            className: "toast_error",
            text: "Can't load sheets!"
        }).showToast();
    })
}

function populate_type_one_columns(parentCard, sheet_id){
    let frag = document.createDocumentFragment();

    stage.children[0].children.forEach((sheet_group)=>{
        if (sheet_group.shapeType == "sheet" && sheet_group.id == sheet_id){
            sheet_group.children.forEach((column_group)=>{
                if (column_group.shapeType == "column" && column_group.isShow){
                    //add this to the menu
                    let node = document.createElement("div");
                    node.className = "reporting_column";
                    node.appendChild(document.createTextNode(column_group.colName));

                    node.onclick = ()=>{
                        parentCard.querySelector(".reporting_column.active")?.classList?.remove("active");
                        node.classList.add("active");
                        //now query the data 
                        generate_graph(parentCard, sheet_id, column_group.id, column_group.colName);
                    }
                    frag.appendChild(node);
                }
            })
        }
    });
    frag.children[0].click();
    parentCard.querySelector(".reporting--column_tray").appendChild(frag);
}

function generate_graph(parentCard, sheet_id, column_uuid, colName){

    $.ajax({
        url: "/reporting/generate_graph_type_one",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({sheet_id, column_uuid}),
        success: (data)=>{
            console.log(data);
            if (data?.success === true){

                //generate graph now 
                let canvas = refresh_canvas(parentCard);
                let graph = create_graph(data.colType, data.data, canvas, colName);
                
                if (graph !== undefined)
                    parentCard.querySelector(".reporting_chart").appendChild(canvas);
                
            }else{
                Toastify({
                    className: "toast_error",
                    text: data?.body || "Unexpected error!"
                }).showToast();
            }

        },error: ()=>{
            Toastify({
                className: "toast_error",
                text: "Unexpected error!"
            }).showToast();
        }
    })
}

function get_graph_object(colType, graph_object, canvas, colName){


    console.log(graph_object);
    switch(colType){
        case "string":
            return new Chart(canvas,{
                type: "pie",
                data:{
                    labels: graph_object.labels,
                    datasets: [
                        {
                            data: graph_object.dataset,
                            label: "No. of occurrences"                       
                        }
                    ]
                }
            })
        case "number":
            return new Chart(canvas, {
                type: "line",
                data: {
                    labels: graph_object.labels,
                    datasets: [
                        {
                            data: graph_object.dataset,
                            label: colName
                        }
                    ]
                },
                options:{
                    plugins:{
                        legend:{
                            display: false
                        }
                    }
                }
            })
    }
}

function create_graph(colType, data, canvas, colName){
    switch (colType){
        case "string":
            return get_graph_object(colType, create_graph__string(data), canvas, colName);
        case "number":
            return get_graph_object(colType, create_graph__number(data), canvas, colName);
        default: 
        return undefined;
    }
}

function create_graph__number(data){
    let labels = [];
    let dataset = [];
    
    for (let index = 0; index < data.length; index++){
        labels.push(index + 1);
    }

    data.forEach((data_object)=>{
        dataset.push(data_object.value);
    })

    return {labels, dataset};
}

function create_graph__string(data){
    //now for each data we should create the labels 
    //and get the number of occurences too

    let labels = [];
    let fake_labels = [];
    let dataset = [];

    data.forEach((data_object)=>{
        let {value} = data_object;

        let sanitized_text = value.toLowerCase().replaceAll(" ", "").replaceAll(/[^\w\s]/g, '');


        if (fake_labels.indexOf(sanitized_text) == -1){
            labels.push(value);
            fake_labels.push(sanitized_text);
            dataset.push(1);
        }else{
            let index = fake_labels.indexOf(sanitized_text);
            dataset[index]++;
        }

    })

    return {labels, dataset};
}


function generate_labels(length){
    let arr = [];
    for (let index = 0;index<length; index++){
        arr.push(index+1);
    }

    return arr;
}

function get_values_array(response, colType){
    let returned = [];

    switch(colType){
        case "string":

        break;
        case "number":
            response.forEach((data))
        break;
    }

    return returned;
}

function refresh_canvas(node){
    let canvas = document.createElement("canvas");

    if (node.querySelector(".reporting_chart canvas") !== null){
        node.querySelector(".reporting_chart canvas").remove();
    }

    return canvas;
}

function get_sheet_names(sheet_ids = [])
{
    return new Promise((res, rej)=>{
        if (sheet_ids.length != 0){
            $.ajax({
                url: "/reporting/get_sheet_names",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({sheet_ids}),
                success: (data)=>{
                    if (data?.success === true){
                        res(data.data);
                    }else{
                        rej();
                    }
                },error: ()=>{
                    rej();
                }
            })
        }else
        rej();
    })
}

function toggle_step(view_name){
    let steps = document.querySelectorAll(".reporting--step");

    Array.from(steps).forEach((step)=>{
        if (step.id != `step_${view_name}`){
            step.classList.remove("active");
        }else{
            step.classList.add("active");
        }
    })
}

function generate_report(){
    //send the data to the backend, then start the magic  
    switch_to_view("report");
}