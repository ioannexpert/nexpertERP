//create the stage
var prevColumn;
var sheet_groups = [];

var stage = new Konva.Stage({
    container: "konva",
    width: document.querySelector(".page_content").clientWidth,
    height: 900
});

var lines = [];

var layer = new Konva.Layer();

stage.on("click", (e)=>{
    if (e.target.parent == null){
        //show the general page now 
        showMenuPage("general");
        clear_sheet_focus();
    }
})

stage.add(layer);


function clear_sheet_focus(){
    sheet_groups.forEach((group)=>{
        group.children[0].stroke("black");
        group.children[0].strokeWidth(1);
    })
}

function showMenuPage(id){
    let pages = document.querySelectorAll(".konva_menu--body_page");

    Array.from(pages).forEach((page)=>{
        if (page.id == id){
            page.classList.remove("hidden");
        }else{
            page.classList.add("hidden");
        }
    })
}

//fn to create konva_sheet 
function sheet(sheet_name = "", sheet_cols = [], sheet_id){
    //create the group 
    var sheet_group = new Konva.Group({
        x:5,
        y: 5,
        draggable: true
    });
    sheet_group.id = sheet_id;
    sheet_group.shapeType = "sheet";
    sheet_group.sheetName = sheet_name;

    var body = new Konva.Rect({
        x: 0,
        y: 0,
        width: 150,
        height: 200,
        cornerRadius: 5,
        fill: "white",
        stroke: 'black',
        strokeWidth: 1,
        
    });

    var sheet_title_container = new Konva.Rect({
        x: 0,
        y: 0,
        width: 150,
        height: 20,
        cornerRadius: 5,
        fill: "#FFAC47"
    });

    var sheet_title = new Konva.Text({
        x: 5,
        y: 3,
        text: sheet_name,
        fontSize: 16
    });


    sheet_group.on("dragmove",()=>{
        //update the line
        lines.forEach((line_obj)=>{

            if (line_obj.start.parent == sheet_group || line_obj.end.parent == sheet_group){
                update_points(line_obj, sheet_group);
            }

        })
    });

    sheet_group.on("click",()=>{
        focus_sheet(sheet_group, body);       
    })

    sheet_group.add(body);
    sheet_group.add(sheet_title_container);
    sheet_group.add(sheet_title);

    sheet_cols.forEach((col, _index)=>{
        sheet_group.add(sheet_column(0, 20 * (_index + 1), col));
    })

    sheet_groups.push(sheet_group);
    return sheet_group;
}

function focus_sheet(group, body){
    clear_sheet_focus();

    group.isFocused = true;
    body.stroke("red");
    body.strokeWidth(1);
    //bring it to front 
    group.zIndex(group.parent.children.length - 1);

    //show in the menu
    
    //first hide the other tabs  
    showMenuPage("sheet_menu");

    //remove previous content 
    let sheet_menu_page = document.querySelector("#sheet_menu");

    Array.from(sheet_menu_page.querySelectorAll("li")).forEach((li)=>{
        li.remove();
    })

    for (let child of group.children){
        if (child?.shapeType === "column"){
            let li = document.createElement("li");
            let input = document.createElement("input");
            input.className = "checkbox2";
            input.type = "checkbox";
            input.style = "--size: 20px;";
            input.checked = child.isShow;

            input.onchange = ()=>{
                child.isShow = input.checked;
                console.log(child);

                //change the background now 
                if (child.isShow){
                    child.children[0].fill("white");
                }else{
                    child.children[0].fill("#FF5757");
                }
            }
            
            li.appendChild(input);
            li.appendChild(document.createTextNode(child.colName));
            sheet_menu_page.querySelector("ul").appendChild(li);    
        }
    }
}

function update_points(line_obj, sheet){
    let line = line_obj.line;
    let points = line.getPoints();
    
    points[0] = line_obj.start.x() + line_obj.start.parent.x() + 148;
    points[1] = line_obj.start.y() + line_obj.start.parent.y() + 10;
        
    points[2] = line_obj.end.x() + line_obj.end.parent.x() ;
    points[3] = line_obj.end.y() + line_obj.end.parent.y() + 10;
        

    let angle = Math.atan2( points[3] - points[1], points[2] - points[0] ) * ( 180 / Math.PI );
    
    if (angle < -130 || angle > 130)
    {
        //change start with end 
        points[0] -= 148;
        points[2] += 148;


        let aux = line_obj.start;
        line_obj.start = line_obj.end;
        line_obj.end = aux;

        //flip the relation 
        if (line_obj.relation == 2){
            line_obj.text.text(decode_relation(3));
            line_obj.relation = 3;
        }else if (line_obj.relation == 3){
            line_obj.text.text(decode_relation(2));
            line_obj.relation = 2;
        }
        line.setPoints(points);
    }


    var textX = (points[0] + points[2]) / 2; 
    var textY = (points[1] + points[3]) / 2; 

    var angle2 = Math.atan2(points[3] - points[1], points[2] - points[0]);
    textX += 10 * Math.cos(angle2);
    textY += 10 * Math.sin(angle2) + 5;

    line_obj.text.x(textX);
    line_obj.text.y(textY);
    line_obj.text.rotation(angle2 * (180 / Math.PI));
}


function sheet_column(x, y, col_object){
    let group = new Konva.Group({
        x: 1,
        y
    });

    let rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: 148,
        height: 20
    });

    let text = new Konva.Text({
        x: 5,
        y: 5,
        fontSize: 14,
        text: col_object.name
    });

    group.on("mouseover", function(){
        if (group.isShow === true)
            rect.fill("#F5F5F5");
        stage.container().style.cursor = "pointer";
    });

    group.on("mouseout",function(){
        if (group.isShow)
            rect.fill("white");
        else
            rect.fill("#FF5757");
        stage.container().style.cursor = "initial";
    });

    var circle = new Konva.Circle({
        x: 148,
        y: 10,
        radius: 5,
        fill: "#FFAC47"
    });

    
    group.on("click", ()=>{
        let fill = circle.fill();
        if (fill == "#FF8C00")
        {
            circle.fill("#FFAC47");
            prevColumn = null;
        }else{
            circle.fill("#FF8C00");
            
            if (prevColumn != null){
                //work with parent for position
                drawLine(prevColumn, group);
                return;
            }
            prevColumn = group;
        }
    })

    group.add(rect);
    group.add(text);
    group.add(circle);

    group.id = col_object.uuid;
    group.shapeType = "column";
    group.colName = col_object.name;
    group.isShow = true;

    return group;
}

function drawLine(group1, group2){

    let [sheet1X, sheet1Y] = [group1.parent.x(), group1.parent.y()];
    let [sheet2X, sheet2Y] = [group2.parent.x(), group2.parent.y()];

    let line = new Konva.Line({
        points: [sheet1X + group1.x() + 148, sheet1Y + group1.y() + 10, sheet2X + group2.x(), sheet2Y + group2.y() + 10],
        stroke: "#66ABF4",
        strokeWidth: 5,
        lineCap: "round"
    });

    line.addEventListener("mouseover",()=>{
        stage.container().style.cursor = "pointer";
        line.shadowColor("red");
        line.shadowBlur(5);
    })

    line.addEventListener("mouseout", ()=>{
        stage.container().style.cursor = "initial";
        line.shadowColor(null);
        line.shadowBlur(0);
    })

    let points = line.getPoints();

    var textX = (points[0] + points[2]) / 2; 
    var textY = (points[1] + points[3]) / 2; 

    var angle2 = Math.atan2(points[3] - points[1], points[2] - points[0]);
    textX += 10 * Math.cos(angle2);
    textY += 10 * Math.sin(angle2) + 5;


    let text = new Konva.Text({
        x: textX,
        y: textY,
        text: "",
        align: "center",
        rotation: angle2 * (180 / Math.PI)
    })

    layer.add(text);

    let line_obj = {
        line,
        start: group1,
        end: group2,
        text,
        relation: -1
    };

    line.addEventListener("click", ()=>{
        //load the line into the menu 
        showMenuPage("relation");
        render_relation_menu(line_obj);
    })


    lines.push(line_obj);

    layer.add(line);
    get_relation_type(group1.id, group2.id, line_obj);

    prevColumn = null;
}

function render_relation_menu(line_obj){
    let parentNode = document.querySelector(".konva_menu--body_page#relation");
    let relationType = line_obj.relation;
    let start_sheet = line_obj.start.parent.sheetName;
    let end_sheet = line_obj.end.parent.sheetName;
    
    let text = "No data available for this relation!";

    switch(relationType){
        case 1:
            text = `one line from <b>${start_sheet}</b> corresponds to one line from <b>${end_sheet}</b>`;
            break;
        case 2: 
            text = `one line from <b>${start_sheet}</b> corresponds to multiple lines from <b>${end_sheet}</b>`;
            break;
        case 3:
            text = `multiple lines from <b>${start_sheet}</b> corresponds to one line from <b>${end_sheet}</b>`;
            break;
        case 4:
            text = `multiple lines from <b>${start_sheet}</b> corresponds to multiple lines from <b>${end_sheet}</b>`;
            break;
    }
    parentNode.querySelector("span").innerHTML = text;
    let select_node = parentNode.querySelector(".custom_select");
    
    if (custom_select === undefined){
        custom_select = new customSelect();
    }

    if (!select_node.dataset.uuid){
        custom_select.init(select_node);

        select_node.addEventListener("customSelect_changed",(ev)=>{
            line_obj.relation = parseInt(ev.detail.value);
            //change text 
            line_obj.text.text(decode_relation(line_obj.relation));
            //refresh 
            render_relation_menu(line_obj);
        });
    }

    custom_select.selectOption(select_node, relationType);
}

function get_relation_type(uuid1, uuid2, line_obj){
    //get relation type

    $.ajax({
        url: "/reporting/relation_type",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({column1: uuid1, column2: uuid2}),
        success: (data)=>{
            if (data?.success === true){

                line_obj.relation = data.data;
                if (data.data == 0){
                    line_obj.text.text("Error");
                }else{
                    line_obj.text.text(decode_relation(data.data));
                }

                if (line_obj.start.id != uuid1 && line_obj.end.id != uuid2){
                    //flip 
                    if (line_obj.relation == 2){
                        line_obj.relation = 3;
                        line_obj.text.text(decode_relation(3));
                    }else if (line_obj.relation == 3){
                        line_obj.relation = 2;
                        line_obj.text.text(decode_relation(2));
                    }
                }
            }else{
                line_obj.text.text("Error");
            }
        }, error:()=>{
            Toastify({
                className: "toast_error",
                text: "Could not detect relation type"
            }).showToast();
        }
    })
}

function get_column_shape_by_id(id){
    let returned = undefined;

    for (const sheet_group of stage.children[0].children){
        for (const child of sheet_group.children){
            if (child.shapeType == "column"){
                if (child.id == id){
                    return child;
                }
            }
        }
    }   
    
}

function decode_relation(relation){
    if (relation == 1){
        return "1:1";
    }else if (relation == 2){
        return "1:m";
    }else if (relation == 3){
        return "m:1";
    }else if (relation == 4){
        return "m:m";
    }else{
        return "Error";
    }
}