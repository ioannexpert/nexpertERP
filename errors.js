const EXCEL_CODE = 1;
const SERVER_CODE = 9;

const EXCEL_SHEET_NAME_EMPTY = {
    "body": "The sheet name cannot be empty!",
    "code": `${EXCEL_CODE}001`,
    "shortBody": "Sheet name is empty!",
    "request": "Please complete the sheet name!"
};

const EXCEL_SHEET_NAME_NOT_VALID = {
    "body": "The sheet name can only contain letters, numbers, _ or -!",
    "code": `${EXCEL_CODE}002`,
    "shortBody": "Sheet name not valid!",
    "request": "Please change the sheet name!"
}

const EXCEL_SHEET_NAME_NOT_UNIQUE = {
    "body": "The sheet name is already used!",
    "code": `${EXCEL_CODE}003`,
    "shortBody": "Sheet name not unique!",
    "request": "Please change the sheet name!"
}

const EXCEL_SHEET_NULL = {
    "body": "The sheet does not exist!",
    "code": `${EXCEL_CODE}004`,
    "shortBody": "Sheet not valid!",
    "request": ""
}

const EXCEL_HEADER_NOT_UNIQUE = {
    "body": "This column already exists!",
    "code": `${EXCEL_CODE}100`,
    "shortBody": "Column duplicate",
    "request": "Please change the column name!"
}

const MONGO_DB_CONNECTION = {
    "body": "Database error",
    "code": `${SERVER_CODE}001`,
    "shortBody": "Database error",
    "request": "Please try again later!"
};

const MONGO_DB_QUERY = {
    "body": "Database error",
    "code": `${SERVER_CODE}002`,
    "shortBody": "Database error",
    "request": "Please try again later!"
}

const INCOMPLETE_REQUEST = {
    "body": "Incomplete request! Some data is not present in the request1",
    "code": `${SERVER_CODE}100`,
    "shortBody": "Request not valid!",
    "request": ""
}

module.exports = {
    EXCEL_SHEET_NAME_EMPTY, EXCEL_SHEET_NAME_NOT_VALID, MONGO_DB_CONNECTION, EXCEL_SHEET_NAME_NOT_UNIQUE, MONGO_DB_QUERY, INCOMPLETE_REQUEST, EXCEL_SHEET_NULL, EXCEL_HEADER_NOT_UNIQUE
}