function assert(statement, message) {
    if (statement == undefined || statement == false) {
        alert("Oh no, something went wrong: " + message);
        throw new Error(message);
    }
}