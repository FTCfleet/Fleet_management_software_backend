const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNo: {
        type: String,
        required: true
    },
    warehouseCode:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    role: {
        type: String,
        enum: ['admin', 'supervisor', 'staff'],
        required: true
    },
    passwordChangedAt: {
        type: Date,
        default: null
    }
});

employeeSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
        // Update passwordChangedAt timestamp when password is changed
        // Don't set it on initial registration (when it's a new document)
        if (!this.isNew) {
            this.passwordChangedAt = Date.now();
        }
    }
    next();
});

employeeSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);