
const fonts = ["Arial","Calibri","Times"];
const startFontSize = 12, maxFontSize = 38;
// Events
const boldEvent = document.createEvent("HTMLEvents");
boldEvent.initEvent("bold_change", true, true);

const italicEvent = document.createEvent("HTMLEvents");
italicEvent.initEvent("italic_change", true, true);

const underlineEvent = document.createEvent("HTMLEvents");
underlineEvent.initEvent("underline_change", true, true);

const strikeEvent = document.createEvent("HTMLEvents");
strikeEvent.initEvent("strike_change", true, true);

const fontSizeEvent = document.createEvent("HTMLEvents");
fontSizeEvent.initEvent("fontSize_change", true, true);

const fontFamEvent = document.createEvent("HTMLEvents");
fontFamEvent.initEvent("fontFam_change", true, true);

const cellTypeEvent = document.createEvent("HTMLEvents");
cellTypeEvent.initEvent("cellType_change", true, true);

const dateFormatChange = document.createEvent("HTMLEvents");
dateFormatChange.initEvent("dateFormat_change", true, true);

const decimalChange = document.createEvent("HTMLEvents");
decimalChange.initEvent("decimal_change", true, true);

const bgColorChange = document.createEvent("HTMLEvents");
bgColorChange.initEvent("bg_color", true, true);

const fontColorChange = document.createEvent("HTMLEvents");
fontColorChange.initEvent("font_color", true, true);

const editOptions = document.createEvent("HTMLEvents");
editOptions.initEvent("edit_options", true, true);

function font_changer(elem)
{
    this.htmlParent = elem;
    this.fontFamilyChanger = this.htmlParent.querySelector(".font_changer");
    this.fontSizeSelect = this.htmlParent.querySelector("#fontSize");
    this.currentFont = "";
    this.currentFontSize = startFontSize;

    this.bold = false;
    this.italic = false;
    this.underline = false;
    this.strike = false;
    this.bg_color = "#FFFFFF";
    this.font_color = "#01295F";
}

font_changer.prototype.init = function (){



    for (let font of fonts)
    {
        this.addOptionFont(font);
    }

    for (let i = startFontSize;i<=maxFontSize;i++)
    {
        this.addOptionFontSize(i);
    }
    
    this.change_font(fonts[0]);

    this.htmlParent.querySelector(".action_button.up").onclick = ()=>{
        this.changeSize(1);
    }

    this.htmlParent.querySelector(".action_button.down").onclick = ()=>{
        this.changeSize(-1);
    }

    this.fontFamilyChanger.querySelector(".font_changer--header i").onclick = ()=>{
        this.toggle();
    }

    this.fontSizeSelect.onchange = (event)=>{
        this.currentFontSize = this.fontSizeSelect.options[this.fontSizeSelect.selectedIndex].value;
        
        document.dispatchEvent(fontSizeEvent);
    }

    this.htmlParent.querySelector(".action_button.bold").onclick = ()=>{
        this.change_bold();
    }
    document.addEventListener("bold_change",(e)=>{
        if (this.bold)
            this.htmlParent.querySelector(".action_button.bold").classList.add("active");
        else 
            this.htmlParent.querySelector(".action_button.bold").classList.remove("active");
    })

    // italic
    this.htmlParent.querySelector(".action_button.italic").onclick = ()=>{
        this.change_italic();
    }
    document.addEventListener("italic_change",(e)=>{
        if (this.italic)
            this.htmlParent.querySelector(".action_button.italic").classList.add("active");
        else 
            this.htmlParent.querySelector(".action_button.italic").classList.remove("active");
    })
    
        // underline
        this.htmlParent.querySelector(".action_button.underline").onclick = ()=>{
            this.change_underline();
        }
        document.addEventListener("underline_change",(e)=>{
            if (this.underline)
                this.htmlParent.querySelector(".action_button.underline").classList.add("active");
            else 
                this.htmlParent.querySelector(".action_button.underline").classList.remove("active");
        })

        // strike
        this.htmlParent.querySelector(".action_button.strike").onclick = ()=>{
            this.change_strike();
        }
        document.addEventListener("strike_change",(e)=>{
            if (this.strike)
                this.htmlParent.querySelector(".action_button.strike").classList.add("active");
            else 
                this.htmlParent.querySelector(".action_button.strike").classList.remove("active");
        })

        //data_type
        this.htmlParent.querySelector("#content_type").addEventListener("customSelect_changed",(ev)=>{

            let type = ev.detail.value;
            this.changeCellType(type);

            let e = new CustomEvent("cellType_change",{
                detail: {
                    value: type,
                    prev_type: ev.detail.prev
                }
            });
            document.dispatchEvent(e);

        });

        this.htmlParent.querySelector("#date_format").addEventListener("customSelect_changed",(ev)=>{
            let val = ev.detail.value;

            document.dispatchEvent(new CustomEvent("dateFormat_change",{
                detail: {
                    value: val
                }
            }))
        })

        this.htmlParent.querySelector("#float_left").addEventListener("click",()=>{
            document.dispatchEvent(
                new CustomEvent("decimal_change",{
                    detail: {
                        value: -1
                    }
                })
            )
        })

        this.htmlParent.querySelector("#float_right").addEventListener("click",()=>{
            document.dispatchEvent(
                new CustomEvent("decimal_change",{
                    detail: {
                        value: 1
                    }
                })
            )
        })

        this.htmlParent.querySelector("#edit_options").addEventListener("click", ()=>{
            document.dispatchEvent(
                new CustomEvent("edit_options")
            )
        })

        this.htmlParent.querySelector(".bg_color input").addEventListener("change",(ev)=>{
            this.change_bg_color(ev.target.value);
        })

        this.htmlParent.querySelector(".font_color input").addEventListener("change",(ev)=>{
            this.change_font_color(ev.target.value);
        })
}

font_changer.prototype.change_bg_color = function (color)
{
    this.bg_color = color;
    let textColor = this.hexToRgb(this.bg_color);         
            //calibrate the icon color
            const brightness = Math.round(((parseInt(textColor.r) * 299) +
                      (parseInt(textColor.g) * 587) +
                      (parseInt(textColor.b) * 114)) / 1000);
            this.htmlParent.querySelector(".bg_color i").style.color = (brightness > 125) ? 'black' : 'white';

            this.htmlParent.querySelector('.bg_color').style.backgroundColor = this.bg_color;

    let e = new CustomEvent("bg_color",{
        detail: {
            value: this.bg_color
        }
    });
    document.dispatchEvent(e);
}

font_changer.prototype.change_font_color = function (color)
{
    this.font_color = color;
    let textColor = this.hexToRgb(this.font_color);         
            //calibrate the icon color
            const brightness = Math.round(((parseInt(textColor.r) * 299) +
                      (parseInt(textColor.g) * 587) +
                      (parseInt(textColor.b) * 114)) / 1000);
            this.htmlParent.querySelector(".font_color i").style.color = (brightness > 125) ? 'black' : 'white';

            this.htmlParent.querySelector('.font_color').style.backgroundColor = this.font_color;

    let e = new CustomEvent("font_color",{
        detail: {
            value: this.font_color
        }
    });
    document.dispatchEvent(e);
}

font_changer.prototype.hexToRgb = function(hex){
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

font_changer.prototype.loadCellType = function (cellNode)
{
    let type = cellNode.dataset?.type || "string";
    customSelect.selectOption(this.htmlParent.querySelector("#content_type"), type);
    if (type == "date")
    {
        customSelect.selectOption(this.htmlParent.querySelector("#date_format"), cellNode.dataset.format || "DD.MM.YYYY", true);
    }
    this.changeCellType(type);

}

font_changer.prototype.changeCellType = function(type)
{
    //hide all rows for now 
    Array.from(this.htmlParent.querySelector(".content_type").querySelectorAll(".excel_group--row[data-for]")).forEach((elem)=>{elem.classList.add("hidden")});

    //first we should show the sub-menu for this type 
    this.htmlParent.querySelector(`.content_type .excel_group--row[data-for='${type}']`)?.classList.remove("hidden");
}

font_changer.prototype.checkCellType = function(type, node){
    let value = node.innerText, ok = false;

    switch(type)
    {
        case "string":
            ok = true;
        break;
        case "number":
            let intValue = parseFloat(value);
            ok = !isNaN(intValue);
        break;
        case "date":
            ok = true;
        break;
    }

    return ok;
}

font_changer.prototype.change_bold = function (value = null){
    if (value === null)
    {
        this.bold = !this.bold;
    }
    else{
        this.bold = value;
    }

    document.dispatchEvent(boldEvent);
}

font_changer.prototype.change_italic = function (value = null){
    if (value === null)
    {
        this.italic = !this.italic;
    }
    else{
        this.italic = value;
    }

    document.dispatchEvent(italicEvent);
}

font_changer.prototype.change_underline = function (value = null){
    if (value === null)
    {
        this.underline = !this.underline;
    }
    else{
        this.underline = value;
    }

    if(this.underline)
    {
        this.change_strike(false);
    }

    document.dispatchEvent(underlineEvent);
}

font_changer.prototype.change_strike = function (value = null){
    if (value === null)
    {
        this.strike = !this.strike;
    }
    else{
        this.strike = value;
    }

    if(this.strike)
    {
        this.change_underline(false);
    }

    document.dispatchEvent(strikeEvent);
}

font_changer.prototype.addOptionFont = function(font_name) {
    let option = document.createElement("div");
    option.className = "font_changer--font";
    option.textContent = font_name;

    option.style.fontFamily = `${font_name}`;

    option.onclick = ()=>{
        this.change_font(font_name);
    }

    this.fontFamilyChanger.querySelector(".font_changer--content").appendChild(option);
}

font_changer.prototype.change_font = function(font_name, toggle = true){
    if (fonts.indexOf(font_name) === -1)
       {
        this.change_font("Arial");
        return ;
       }

    this.currentFont = font_name;
    this.fontFamilyChanger.querySelector("input").value = font_name;
    toggle && this.toggle();
    document.dispatchEvent(fontFamEvent);
}

font_changer.prototype.toggle = function(){
    this.fontFamilyChanger.classList.toggle("active");
}

font_changer.prototype.addOptionFontSize = function(size){
    let option = document.createElement("option");
    option.value = size;
    option.textContent = size;

    this.fontSizeSelect.appendChild(option);
}

font_changer.prototype.changeSize = function(increment){

    let curr_index = this.fontSizeSelect.selectedIndex;

    if (this.fontSizeSelect.options[curr_index + increment])
    {
        this.fontSizeSelect.selectedIndex = curr_index + increment;
        this.fontSizeSelect.dispatchEvent(new Event("change"))
    }

}

font_changer.prototype.setFontSize = function(fontSize)
{
    if (fontSize >= startFontSize && fontSize <= maxFontSize)
    {
        console.log("here");
        //valid
        this.changeSize(fontSize - this.currentFontSize);
    }
    else{
        this.setFontSize(12);
    }
}

font_changer.prototype.loadStyles = function (styles)
{
    console.log(styles);
    //load the font size
    if (styles?.fontSize)
    {
        this.setFontSize(parseInt(styles.fontSize));
    }
    else{
        this.setFontSize(12);
    }

    if (styles?.fontFamily)
    {
        this.change_font(styles.fontFamily, false);
    }
    else{
        this.change_font("Arial", false);
    }

    if (styles?.fontWeight && styles.fontWeight === "bold")
    {
        this.change_bold(true);
    }
    else{
        this.change_bold(false);
    }

    if (styles?.fontStyle && styles.fontStyle === "italic")
    {
        this.change_italic(true);
    }
    else{
        this.change_italic(false);
    }

    if (styles?.backgroundColor)
    {
        this.change_bg_color(styles.backgroundColor);
    }else{
        this.change_bg_color("#FFFFFF");
    }

    if (styles?.color)
    {
        this.change_font_color(styles.color);
    }else{
        this.change_font_color("#01295F");
    }

    if (styles?.textDecoration)
    {
        if (styles.textDecoration === "line-through")
            {
                this.change_underline(false);
                this.change_strike(true);
            }
        else if (styles.textDecoration === "underline"){
            this.change_underline(true);
            this.change_strike(false);
        }
        else{
            this.change_underline(false);
            this.change_strike(false);
        }
    }
    else{
        this.change_underline(false);
        this.change_strike(false);
    }
}