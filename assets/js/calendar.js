const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
  
const dateChanged = document.createEvent("HTMLEvents");
dateChanged.initEvent("date_changed", true, true);

function calendar(node)
{
    this.node = null;
    this.month = undefined;
    this.year = undefined;
    this.selectedDate = undefined;

    //init 
    if (node)
    {
        this.node = node;
    }else{
        console.error("The calendar node does not exist!");
    }

    this.init_calendar();
}

calendar.prototype.init_calendar = function()
{
    //add the years     
    this.init_listeners();
    this.add_years();
    this.add_months();
    this.populateDays();
}

calendar.prototype.init_listeners = function()
{
    this.node.querySelector("#calendar__month").addEventListener("change",(ev)=>{
        this.populateDays(ev.target.options[ev.target.selectedIndex].value);
    });

    this.node.querySelector("#calendar__year").addEventListener("change",(ev)=>{
        this.populateDays(this.month, ev.target.options[ev.target.selectedIndex].value);
    })

    this.node.querySelector(".cancel_button").addEventListener("click",()=>{
        this.node.classList.remove("open");
    });
}

calendar.prototype.setCallback = function (context, cb, ...args)
{

    this.node.querySelector(".submit_button").onclick = ()=>{
        if (this.selectedDate !== undefined)
        {    
            args.push(this.selectedDate);
            args.push(context);
            if (context !== undefined)
            {
                cb(...args);
            }else{
                cb.apply(context, ...args);
            }
            this.close();
        }else{
            Toastify({
                text: "Please select a date first!",
                className: "toast_error"
            }).showToast();
        }
    }
    
}

calendar.prototype.open = function(){
    this.selectedDate = undefined;
    this.node.classList.add("open");
}

calendar.prototype.close = function(){
    this.node.classList.remove("open");
}

calendar.prototype.add_years = function(threshold = 10){
    let current_year = new Date().getFullYear(), frag = document.createDocumentFragment(), option;

    for (let year = current_year - threshold;year <= current_year + threshold;year++)
    {
        //create option node    
        option = document.createElement("option");
        option.value = year;
        option.textContent = year;

        if (year == current_year)
        option.selected = true;

        frag.appendChild(option);
    }

    this.node.querySelector("#calendar__year").appendChild(frag);
}

calendar.prototype.add_months = function (){
    let frag = document.createDocumentFragment(), option, currentMonth = new Date().getMonth();
    
    MONTHS.forEach((month, index)=>{
        option = document.createElement("option");
        option.value = index;
        option.textContent = month;

        if (index == currentMonth)
        option.selected = true;

        frag.appendChild(option);
    })

    this.node.querySelector("#calendar__month").appendChild(frag);
}

calendar.prototype.clearDays = function(){
    
    Array.from(this.node.querySelectorAll(".calendar__date")).forEach((elem)=>elem.remove());

}

calendar.prototype.getDaysInDate = function (month, year)
{
    return new Date(year, month + 1, 0).getDate();
}

calendar.prototype.getLastMonday = function (date){
    let copyDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    while (copyDate.getDay() != 1)
    {
        copyDate.setDate(copyDate.getDate() - 1);
    }

    return copyDate.getDate();
}

calendar.prototype.dateNode = function (month, year, date, extraClasses = ""){

    let node = document.createElement("div");
    
    node.className = `calendar__date ${extraClasses} ${ (this.selectedDate !== undefined && this.selectedDate.getTime() === new Date(year, month, date).getTime()) ? "calendar__date--selected" : "" }`;
    node.textContent = date;

    node.dataset.month =month;
    node.dataset.year = year;
    node.dataset.day = date;

    node.onclick = ()=>{
        this.selectedDate = new Date(year, month, date);
        this.selectDay(node);
        document.dispatchEvent(new CustomEvent("date_changed",{
            detail: {
                "date": this.selectedDate
            }
        }))
    }

    return node;
}

calendar.prototype.selectDay = function (node)
{
    this.node.querySelector(".calendar__date--selected")?.classList.remove("calendar__date--selected");
    node.classList.add("calendar__date--selected");
}

calendar.prototype.currentMonthDayNodes = function (noDays){
    let frag = document.createDocumentFragment();
    
    for (let day = 1; day <= noDays; day++)
    {
        frag.appendChild(this.dateNode(this.month, this.year, day));
    }

    return frag;
}

calendar.prototype.lastMonthDayNodes = function (date)
{
    let startDay = this.getLastMonday(date), frag = document.createDocumentFragment();

    for (let dayNum = startDay; dayNum <= this.getDaysInDate(date.getMonth(), date.getFullYear()); dayNum++)
    {
        frag.appendChild(this.dateNode(this.month - 1, this.year, dayNum, "calendar__date--grey"));
    }

    return frag;
}

calendar.prototype.nextMonthDayNodes = function(limit){

    let frag = document.createDocumentFragment();

    for (let dayNum = 1;dayNum <= limit; dayNum++)
    {
        frag.appendChild(this.dateNode(this.month + 1, this.year, dayNum, "calendar__date--grey"));
    }

    return frag;
}

calendar.prototype.populateDays = function (month = new Date().getMonth(), year = new Date().getFullYear())
{
    this.month = month;
    this.year = year;
    this.node.querySelector("#calendar__month").value = month;
    this.node.querySelector("#calendar__year").value = year;

    console.log("d")
    this.clearDays();

    let date = new Date(year, month, 1);

    let pastDate = new Date(year,  month, 1);
    pastDate.setMonth(date.getMonth() - 1);
    let frag = document.createDocumentFragment();
    
    //last month
    if (date.getDay() !== 1)
        frag.appendChild(this.lastMonthDayNodes(pastDate));
    //current month
    frag.appendChild(this.currentMonthDayNodes(this.getDaysInDate(date.getMonth(), date.getFullYear())));

    //next month 
    date.setDate(this.getDaysInDate(date.getMonth(), date.getFullYear()));

    //if last day from current month is not sunday 
    if(date.getDay() != 0)
    {
        frag.appendChild(this.nextMonthDayNodes((7 - date.getDay() + 6) % 7 + 1));
    }


    this.node.querySelector(".calendar__dates").appendChild(frag);
}

calendar.prototype.moveTo = function (node)
{
    let bBox = node.getBoundingClientRect();
    let width = this.node.offsetWidth;
    let height = this.node.offsetHeight;

    if (bBox.top + node.offsetHeight + 5 + height > window.innerHeight)
    {
        //show it above 
        this.node.style.top = `${bBox.top - height - 5 + window.scrollY}px`;
    }else{
        this.node.style.top = `${bBox.top + node.offsetHeight + 5 + window.scrollY }px`;
    }

    if (bBox.left + width > window.outerWidth)
    {
        //show it to the right
        this.node.style.left = `${window.outerWidth - width - 20 + window.scrollX}px`;
    }else{
        this.node.style.left = `${bBox.left + window.scrollX}px`;
    }

}