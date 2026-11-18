
const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const app = express();

// Render provides its own PORT
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// DATA FOLDER
const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

// JSON FILES
const usersFile = path.join(dataFolder, "users.json");
const bookingsFile = path.join(dataFolder, "bookings.json");
const messagesFile = path.join(dataFolder, "messages.json");

[usersFile, bookingsFile, messagesFile].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
    }
});

// READ JSON DATA
function readData(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

// WRITE JSON DATA
function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: "Please fill all fields." });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Enter a valid email." });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: "Enter a valid 10-digit phone number." });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must contain at least 8 characters." });
        }

        const users = readData(usersFile);

        const existingUser = users.find(
            user => user.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: "USR" + Date.now(),
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeData(usersFile, users);

        res.status(201).json({
            message: "Registration successful!",
            user: {
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed." });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Enter email and password." });
        }

        const users = readData(usersFile);

        const user = users.find(
            u => u.email.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
            return res.status(401).json({ message: "Email is not registered." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        res.json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed." });
    }
});

// CREATE BOOKING
app.post("/api/bookings", (req, res) => {
    try {
        const { name, email, phone, destination, date, travellers } = req.body;

        if (!name || !email || !phone || !destination || !date || !travellers) {
            return res.status(400).json({ message: "Please fill all booking fields." });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: "Enter a valid 10-digit phone number." });
        }

        const travelDate = new Date(date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(travelDate.getTime()) || travelDate < today) {
            return res.status(400).json({ message: "Choose a valid future travel date." });
        }

        const booking = {
            id: "BK" + Date.now(),
            name,
            email,
            phone,
            destination,
            date,
            travellers: Number(travellers),
            createdAt: new Date().toISOString()
        };

        const bookings = readData(bookingsFile);
        bookings.push(booking);
        writeData(bookingsFile, bookings);

        res.status(201).json({
            message: "Booking successful!",
            bookingId: booking.id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Booking failed." });
    }
});

// VIEW BOOKINGS
app.get("/api/bookings", (req, res) => {
    try {
        res.json(readData(bookingsFile));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load bookings." });
    }
});

// CONTACT MESSAGE
app.post("/api/contact", (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: "Please fill all fields." });
        }

        const messages = readData(messagesFile);

        const newMessage = {
            id: "MSG" + Date.now(),
            name,
            email,
            subject,
            message,
            createdAt: new Date().toISOString()
        };

        messages.push(newMessage);
        writeData(messagesFile, messages);

        res.status(201).json({
            message: "Thank you! Your message has been saved successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to save your message." });
    }
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(`WanderWay server running on port ${PORT}`);
});
