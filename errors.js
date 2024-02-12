const EXCEL_CODE = 1;
const SERVER_CODE = 9;
const AUTH_CODE = 8;

const EXCEL_SHEET_NAME_EMPTY = {
    "body": "The sheet name cannot be empty!",
    "code": `${EXCEL_CODE}001`,
    "shortBody": "Sheet name is empty!",
    "request": "Please complete the sheet name!",
    success: false
};

const EXCEL_SHEET_NAME_NOT_VALID = {
    "body": "The sheet name can only contain letters, numbers, _ or -!",
    "code": `${EXCEL_CODE}002`,
    "shortBody": "Sheet name not valid!",
    "request": "Please change the sheet name!",
    success: false
}

const EXCEL_SHEET_NAME_NOT_UNIQUE = {
    "body": "The sheet name is already used!",
    "code": `${EXCEL_CODE}003`,
    "shortBody": "Sheet name not unique!",
    "request": "Please change the sheet name!",
    success: false
}

const EXCEL_SHEET_NULL = {
    "body": "The sheet does not exist!",
    "code": `${EXCEL_CODE}004`,
    "shortBody": "Sheet not valid!",
    "request": "",
    success: false
}

const EXCEL_HEADER_NOT_UNIQUE = {
    "body": "This column already exists!",
    "code": `${EXCEL_CODE}100`,
    "shortBody": "Column duplicate",
    "request": "Please change the column name!",
    success: false
}

const MONGO_DB_CONNECTION = {
    "body": "Database error",
    "code": `${SERVER_CODE}001`,
    "shortBody": "Database error",
    "request": "Please try again later!",
    success: false
};

const MONGO_DB_QUERY = {
    "body": "Database error",
    "code": `${SERVER_CODE}002`,
    "shortBody": "Database error",
    "request": "Please try again later!",
    success: false
}

const INCOMPLETE_REQUEST = {
    "body": "Incomplete request! Some data is not present in the request1",
    "code": `${SERVER_CODE}100`,
    "shortBody": "Request not valid!",
    "request": "",
    success: false
}

const MYSQL_DB_CONNECTION = {
    "body": "Database error",
    "code": `${SERVER_CODE}003`,
    "shortBody": "Database error",
    "request": "Please try again later!",
    success: false
};

const MYSQL_DB_QUERY = {
    "body": "Database error",
    "code": `${SERVER_CODE}004`,
    "shortBody": "Database error",
    "request": "Please try again later!",
    success: false
};

const AUTH_NO_USER_FOUND = {
    "body": "No user found!",
    "code": `${AUTH_CODE}000`,
    "shortBody": "No user found",
    "request": "Please change the username!",
    success: false
};

const AUTH_WRONG_PASS = {
    "body": "Credentials are wrong!",
    "code": `${AUTH_CODE}001`,
    "shortBody": "Credentials are wrong",
    "request": "",
    success: false
};

module.exports = {
    EXCEL_SHEET_NAME_EMPTY, EXCEL_SHEET_NAME_NOT_VALID, MONGO_DB_CONNECTION, EXCEL_SHEET_NAME_NOT_UNIQUE, MONGO_DB_QUERY, INCOMPLETE_REQUEST, EXCEL_SHEET_NULL, EXCEL_HEADER_NOT_UNIQUE, MYSQL_DB_CONNECTION, MYSQL_DB_QUERY, AUTH_NO_USER_FOUND,
    AUTH_WRONG_PASS
}