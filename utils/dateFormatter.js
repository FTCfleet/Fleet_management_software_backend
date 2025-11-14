const formatToIST = (dateObj) => {
    const date = new Date(dateObj);
    // console.log(date.getUTCHours());
    const hours24 = date.getUTCHours();
    const hours12 = (hours24 % 12 || 12).toString().padStart(2,'0');
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const ampm = hours24 >= 12 ? "PM" : "AM";
    
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    // console.log(hours12);

    return `${hours12}:${minutes} ${ampm} ${day}/${month}/${year}`;
};

const getNow = () => {
    const dd = new Date();
    const date = new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate(), dd.getHours(), dd.getMinutes()));
    return date;
}

module.exports = {formatToIST, getNow};