const ServiceEnquiry = require('../models/serviceEnquirySchema');
const ExpressError = require('../utils/expressError');

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const MAX_ENQUIRIES = 5;

// Get client IP (handles proxies)
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.ip;
};

// Create new service enquiry with rate limiting
module.exports.createEnquiry = async (req, res) => {
    const clientIP = getClientIP(req);
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);

    // Count recent enquiries from this IP
    const recentCount = await ServiceEnquiry.countDocuments({
        ipAddress: clientIP,
        createdAt: { $gte: windowStart }
    });

    if (recentCount >= MAX_ENQUIRIES) {
        return res.status(429).json({
            success: false,
            message: 'Too many enquiries. Please try again after 15 minutes.',
            retryAfter: 15 * 60 // seconds
        });
    }

    const { name, phone, serviceType, pickupLocation, deliveryLocation, description } = req.body;

    const enquiry = new ServiceEnquiry({
        name,
        phone,
        serviceType,
        pickupLocation,
        deliveryLocation,
        description,
        ipAddress: clientIP
    });

    await enquiry.save();

    res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully',
        data: {
            id: enquiry._id,
            remainingEnquiries: MAX_ENQUIRIES - recentCount - 1
        }
    });
};

// Get all enquiries (admin use)
module.exports.getAllEnquiries = async (req, res) => {
    const enquiries = await ServiceEnquiry.find({})
        .sort({ createdAt: -1 })
        .select('-ipAddress'); // Don't expose IP in response

    res.status(200).json({
        success: true,
        count: enquiries.length,
        data: enquiries
    });
};

// Delete enquiry by ID
module.exports.deleteEnquiry = async (req, res) => {
    const { id } = req.params;
    
    const enquiry = await ServiceEnquiry.findByIdAndDelete(id);
    
    if (!enquiry) {
        throw new ExpressError('Enquiry not found', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Enquiry deleted successfully'
    });
};

// Get unseen enquiries count
module.exports.getUnseenCount = async (req, res) => {
    const unseenCount = await ServiceEnquiry.countDocuments({ isRead: false });
    
    res.status(200).json({
        success: true,
        count: unseenCount
    });
};

// Mark all enquiries as read
module.exports.markAllAsRead = async (req, res) => {
    await ServiceEnquiry.updateMany({ isRead: false }, { isRead: true });
    
    res.status(200).json({
        success: true,
        message: 'All enquiries marked as read'
    });
};
