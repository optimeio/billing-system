const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Leave = require("../models/Leave");

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
};

// @desc    Record Check-In (Staff Only)
// @route   POST /api/attendance/check-in
// @access  Private (Staff/Inventory)
exports.checkIn = async (req, res) => {
    try {
        const todayStr = getLocalDateString();

        // Check if already checked in
        const existing = await Attendance.findOne({ userId: req.user._id, date: todayStr });
        if (existing) {
            return res.status(400).json({ message: "You have already checked in for today." });
        }

        // Verify selfie upload
        if (!req.file) {
            return res.status(400).json({ message: "Selfie photo upload is required for check-in verification." });
        }

        const photoPath = `/uploads/${req.file.filename}`;

        const record = await Attendance.create({
            userId: req.user._id,
            date: todayStr,
            status: "present",
            checkIn: new Date(),
            photo: photoPath
        });

        res.status(201).json({
            message: "Checked in successfully! Have a great day at work.",
            record
        });
    } catch (error) {
        console.error("Check-in error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record Check-Out (Staff Only)
// @route   POST /api/attendance/check-out
// @access  Private (Staff/Inventory)
exports.checkOut = async (req, res) => {
    try {
        const todayStr = getLocalDateString();

        // Fetch today's record
        const record = await Attendance.findOne({ userId: req.user._id, date: todayStr });
        if (!record || record.status !== "present") {
            return res.status(400).json({ message: "You must check in first before checking out." });
        }

        if (record.checkOut) {
            return res.status(400).json({ message: "You have already checked out for today." });
        }

        const now = new Date();
        record.checkOut = now;

        // Calculate hours worked
        const diffMs = now.getTime() - record.checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        record.workHours = Math.round(diffHours * 100) / 100;

        await record.save();

        res.json({
            message: "Checked out successfully! Thank you for your work.",
            record
        });
    } catch (error) {
        console.error("Check-out error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Today's Check-In Status (Staff Only)
// @route   GET /api/attendance/today
// @access  Private (Staff/Inventory)
exports.getTodayStatus = async (req, res) => {
    try {
        const todayStr = getLocalDateString();
        const record = await Attendance.findOne({ userId: req.user._id, date: todayStr });
        res.json(record);
    } catch (error) {
        console.error("Get today status error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Personal Attendance History (Staff Only)
// @route   GET /api/attendance/my-history
// @access  Private (Staff/Inventory)
exports.getMyHistory = async (req, res) => {
    try {
        const history = await Attendance.find({ userId: req.user._id })
            .sort({ date: -1 })
            .limit(90); // limit to past 3 months
        res.json(history);
    } catch (error) {
        console.error("Get personal history error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Daily Attendance Log for all staff (Admin Only)
// @route   GET /api/attendance/daily
// @access  Admin Only
exports.getDailyAttendance = async (req, res) => {
    try {
        const { date = getLocalDateString() } = req.query;

        // 1. Fetch all active non-admin users
        const users = await User.find({ role: { $ne: "admin" }, isBlocked: false })
            .select("name email staffId role")
            .sort({ name: 1 });

        // 2. Fetch all attendance records for selected date
        const attendanceRecords = await Attendance.find({ date });
        const recordMap = new Map();
        attendanceRecords.forEach(rec => {
            recordMap.set(rec.userId.toString(), rec);
        });

        // 3. Fetch all approved leaves overlapping this selected date
        const dateParts = date.split("-");
        const year = parseInt(dateParts[0], 10);
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        
        const startOfDay = new Date(year, monthIndex, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, monthIndex, day, 23, 59, 59, 999);

        const leaves = await Leave.find({
            status: "approved",
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });

        const leaveMap = new Map();
        leaves.forEach(lv => {
            leaveMap.set(lv.userId.toString(), lv.leaveType);
        });

        // 4. Merge data
        const dailyLogs = users.map(user => {
            const userIdStr = user._id.toString();
            const rec = recordMap.get(userIdStr);
            const isOnLeave = leaveMap.has(userIdStr);

            let status = "absent";
            if (rec) {
                status = rec.status;
            } else if (isOnLeave) {
                status = "leave";
            }

            return {
                user,
                date,
                status,
                checkIn: rec ? rec.checkIn : null,
                checkOut: rec ? rec.checkOut : null,
                workHours: rec ? rec.workHours : 0,
                photo: rec ? rec.photo : null,
                notes: rec ? rec.notes : (isOnLeave ? `On Leave: ${leaveMap.get(userIdStr)}` : ""),
                recordId: rec ? rec._id : null
            };
        });

        res.json(dailyLogs);
    } catch (error) {
        console.error("Get daily logs error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually mark/override attendance (Admin Only)
// @route   POST /api/attendance/mark
// @access  Admin Only
exports.markAttendance = async (req, res) => {
    try {
        const { userId, date, status, checkIn, checkOut, notes } = req.body;

        if (!userId || !date || !status) {
            return res.status(400).json({ message: "userId, date, and status are required." });
        }

        const employee = await User.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        // Find or create attendance record
        let record = await Attendance.findOne({ userId, date });

        const dateParts = date.split("-");
        const year = parseInt(dateParts[0], 10);
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);

        if (!record) {
            record = new Attendance({
                userId,
                date,
                status
            });
        } else {
            record.status = status;
        }

        record.notes = notes || "";

        if (status === "present") {
            record.checkIn = checkIn ? new Date(checkIn) : (record.checkIn || new Date(year, monthIndex, day, 9, 0, 0));
            if (checkOut) {
                record.checkOut = new Date(checkOut);
                
                // Recalculate duration
                const diffMs = record.checkOut.getTime() - record.checkIn.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                record.workHours = Math.round(Math.max(0, diffHours) * 100) / 100;
            } else {
                record.checkOut = record.checkOut || null;
                record.workHours = record.workHours || 0;
            }
        } else {
            // If absent or leave, clear check-in / check-out data
            record.checkIn = null;
            record.checkOut = null;
            record.workHours = 0;
        }

        await record.save();

        res.json({
            message: `Attendance marked as ${status} successfully.`,
            record
        });
    } catch (error) {
        console.error("Mark attendance error:", error);
        res.status(500).json({ message: error.message });
    }
};
