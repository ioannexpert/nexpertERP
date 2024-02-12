const allowedChars = /[a-zA-Z0-9\_\- ]*/g;
const fullCoords = /^!([a-zA-Z0-9\_\- ]*)#?(\d*)@?([a-zA-Z0-9\-\_ ]*)$/gm;
const general_fullCoords = /^!([a-zA-Z0-9_\- ]*)#?(\d*)@?([a-zA-Z0-9-\_ ]*)$/gm;
 
module.exports = {
    allowedChars, fullCoords, general_fullCoords
}