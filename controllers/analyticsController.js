const Parcel = require('../models/parcelSchema');
const Warehouse = require('../models/warehouseSchema');

// Get analytics dashboard data with filters
module.exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { warehouse, period = 'week', month, year } = req.query;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Build base match query
        let baseMatch = {};

        // Add warehouse filter if specified
        if (warehouse && warehouse !== 'All') {
            const warehouseDoc = await Warehouse.findOne({ name: warehouse });
            if (warehouseDoc) {
                baseMatch.sourceWarehouse = warehouseDoc._id;
            }
        }

        // Calculate date ranges based on period
        let chartStartDate, chartEndDate, chartGroupFormat;
        if (period === 'week') {
            const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
            chartStartDate = thisWeekStart;
            chartEndDate = new Date(thisWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
            chartGroupFormat = '%Y-%m-%d';
        } else if (period === 'month') {
            const selectedYear = parseInt(year) || now.getFullYear();
            const selectedMonth = parseInt(month) || now.getMonth();
            chartStartDate = new Date(selectedYear, selectedMonth, 1);
            chartEndDate = new Date(selectedYear, selectedMonth + 1, 0);
            chartGroupFormat = '%Y-%m-%d';
        }

        // Time ranges for stats
        const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const last60DaysStart = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        // Parallel queries with filters
        const [
            todayCount,
            thisWeekCount,
            thisMonthCount,
            last60DaysCount,
            statusDistribution,
            stationSummary,
            chartTrends
        ] = await Promise.all([
            // Time-based counts with filter
            Parcel.countDocuments({ ...baseMatch, placedAt: { $gte: today } }),
            Parcel.countDocuments({ ...baseMatch, placedAt: { $gte: thisWeekStart } }),
            Parcel.countDocuments({ ...baseMatch, placedAt: { $gte: thisMonthStart } }),
            Parcel.countDocuments({ ...baseMatch, placedAt: { $gte: last60DaysStart } }),

            // Status distribution with filter
            Parcel.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Station-wise summary (only if no warehouse filter)
            warehouse && warehouse !== 'All' ? Promise.resolve([]) : Parcel.aggregate([
                {
                    $lookup: {
                        from: 'warehouses',
                        localField: 'sourceWarehouse',
                        foreignField: '_id',
                        as: 'warehouse'
                    }
                },
                {
                    $unwind: {
                        path: '$warehouse',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            warehouseId: '$sourceWarehouse',
                            warehouseName: '$warehouse.name',
                            status: '$status'
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: {
                            warehouseId: '$_id.warehouseId',
                            warehouseName: '$_id.warehouseName'
                        },
                        statusCounts: {
                            $push: {
                                status: '$_id.status',
                                count: '$count'
                            }
                        },
                        total: { $sum: '$count' }
                    }
                },
                {
                    $sort: { total: -1 }
                },
                {
                    $limit: 50
                }
            ]),

            // Chart trends for selected period with filter
            Parcel.aggregate([
                {
                    $match: {
                        ...baseMatch,
                        placedAt: { $gte: chartStartDate, $lte: chartEndDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: chartGroupFormat,
                                date: '$placedAt'
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ])
        ]);

        // Format station summary
        const formattedStationSummary = stationSummary.map(station => {
            const statusMap = { arrived: 0, dispatched: 0, delivered: 0 };
            station.statusCounts.forEach(sc => {
                if (statusMap.hasOwnProperty(sc.status)) {
                    statusMap[sc.status] = sc.count;
                }
            });

            return {
                stationName: station._id.warehouseName || 'Unknown Station',
                arrived: statusMap.arrived,
                dispatched: statusMap.dispatched,
                delivered: statusMap.delivered,
                total: station.total
            };
        });

        // Format status distribution
        const statusMap = { arrived: 0, dispatched: 0, delivered: 0 };
        statusDistribution.forEach(status => {
            if (statusMap.hasOwnProperty(status._id)) {
                statusMap[status._id] = status.count;
            }
        });

        // Generate chart data based on period
        let chartData = [];
        if (period === 'week') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 0; i < 7; i++) {
                const date = new Date(chartStartDate.getTime() + (i * 24 * 60 * 60 * 1000));
                const dateStr = date.toISOString().split('T')[0];
                const dayName = days[date.getDay()];
                const dayData = chartTrends.find(d => d._id === dateStr);
                chartData.push({
                    day: dayName,
                    date: dateStr,
                    count: dayData ? dayData.count : 0
                });
            }
        } else if (period === 'month') {
            const daysInMonth = chartEndDate.getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(chartStartDate.getFullYear(), chartStartDate.getMonth(), i);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = chartTrends.find(d => d._id === dateStr);
                chartData.push({
                    day: i.toString(),
                    date: dateStr,
                    count: dayData ? dayData.count : 0
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                timeCounts: {
                    today: todayCount,
                    thisWeek: thisWeekCount,
                    thisMonth: thisMonthCount,
                    last60Days: last60DaysCount
                },
                statusDistribution: {
                    arrived: statusMap.arrived,
                    dispatched: statusMap.dispatched,
                    delivered: statusMap.delivered,
                    total: statusMap.arrived + statusMap.dispatched + statusMap.delivered
                },
                stationSummary: formattedStationSummary,
                chartData: chartData
            },
            filters: {
                warehouse: warehouse || 'All',
                period: period,
                month: month,
                year: year
            }
        });
    } catch (error) {
        console.error('Analytics dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get warehouse names for filter dropdown
module.exports.getWarehouseNames = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({})
            .select('name warehouseID')
            .sort({ name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: warehouses.map(w => ({
                id: w.warehouseID || w._id,
                name: w.name
            }))
        });
    } catch (error) {
        console.error('Get warehouses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch warehouses'
        });
    }
};

// Get monthly trends for detailed chart
module.exports.getMonthlyTrends = async (req, res) => {
    const { months = 6 } = req.query;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const monthlyData = await Parcel.aggregate([
        {
            $match: {
                placedAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$placedAt' },
                    month: { $month: '$placedAt' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    const formattedData = monthlyData.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count
    }));

    res.status(200).json({
        success: true,
        data: formattedData
    });
};