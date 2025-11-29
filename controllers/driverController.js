const Driver = require("../models/driverSchema.js");
const Parcel= require("../models/parcelSchema.js");
const Employee= require("../models/employeeSchema.js");

module.exports.allTruckNo = async (req, res) => {
    try {
        const allTruckNo = await Driver.find();
        if (allTruckNo) {
            return res.status(200).json({ message: "Successfull", body: allTruckNo , flag: true});
        } else {
            return res.status(201).json({ message: "No Truck number found", body:[], flag: true });
        }
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch truck numbers", error:err.message , flag: false});
    }
}