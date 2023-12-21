function login()
{
    if (document.querySelector("#logo").classList.contains("next"))
        return;

    let user = document.querySelector("#user").value;
    let pass = document.querySelector("#pass").value;
    document.querySelector("#logo").classList.add("next");

    $.ajax({
        url: "/auth/login",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({user, pass}),
        success: function(){
            //goto dashboard 
            window.location.href = "/home";
        },error: function(err){
            document.querySelector("#logo").parentNode.querySelector("span").textContent = err?.body || "Wrong credentials";
        }
    }).always(()=>{
        setTimeout(()=>{
            document.querySelector("#logo").classList.remove("next");
        },1200);
    })
}