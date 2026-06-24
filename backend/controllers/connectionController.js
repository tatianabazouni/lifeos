import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const mapConnection = (connection, me) => {
  const isSender = String(connection.sender?._id || connection.sender) === String(me);
  const other = isSender ? connection.receiver : connection.sender;

  let status = "accepted";
  if (connection.status === "pending") {
    status = isSender ? "pending_sent" : "pending_received";
  }

  return {
    id: connection._id,
    userId: other?._id || null,
    name: other?.name || "Unknown",
    email: other?.email || "",
    type: connection.type || "friend",
    status,
  };
};

export const listConnections = async (req, res) => {
  const connections = await Connection.find({
    status: { $in: ["pending", "accepted"] },
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
  })
    .populate("sender", "name email")
    .populate("receiver", "name email")
    .sort({ createdAt: -1 });

  res.json(connections.map((connection) => mapConnection(connection, req.user._id)));
};

export const getConnectionById = async (req, res) => {
  const connection = await Connection.findOne({
    _id: req.params.id,
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
  })
    .populate("sender", "name email")
    .populate("receiver", "name email");

  if (!connection) {
    return res.status(404).json({ message: "Connection not found" });
  }

  return res.json(mapConnection(connection, req.user._id));
};

export const searchUsers = async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) {
    return res.json([]);
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  })
    .limit(20)
    .select("name email");

  res.json(users.map((user) => ({ id: user._id, name: user.name, email: user.email })));
};

export const requestConnection = async (req, res) => {
  const { userId, type = 'friend' } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (String(userId) === String(req.user._id)) {
    return res.status(400).json({ message: "Cannot connect with yourself" });
  }

  const exists = await Connection.findOne({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });

  if (exists && exists.status === "accepted") {
    return res.status(400).json({ message: "You are already connected" });
  }

  if (exists && exists.status === "pending") {
    return res.status(400).json({ message: "A connection request is already pending" });
  }

  let connection = exists;
  if (connection && connection.status === "declined") {
    connection.sender = req.user._id;
    connection.receiver = userId;
    connection.status = "pending";
    connection.type = "friend";
    await connection.save();
  } else {
    connection = await Connection.create({
      sender: req.user._id,
      receiver: userId,
      status: "pending",
      type,
    });
  }

  await Notification.create({
    user: userId,
    recipient: userId,
    actor: req.user._id,
    type: "connection_request",
    title: "New connection request",
    message: `${req.user.name} sent you a connection request.`,
    data: {
      connectionId: connection._id,
    },
  });

  res.status(201).json(connection);
};

export const acceptConnection = async (req, res) => {
  const { connectionId } = req.body;
  const connection = await Connection.findOne({ _id: connectionId, receiver: req.user._id });

  if (!connection) {
    return res.status(404).json({ message: "Connection request not found" });
  }

  connection.status = "accepted";
  await connection.save();

  await Notification.updateMany(
    {
      recipient: req.user._id,
      type: "connection_request",
      "data.connectionId": connection._id,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  await Notification.create({
    recipient: connection.sender,
    actor: req.user._id,
    type: "connection_accepted",
    title: "Connection accepted",
    message: `${req.user.name} accepted your connection request.`,
    data: {
      connectionId: connection._id,
    },
  });

  res.json({ message: "Connection accepted" });
};

export const declineConnection = async (req, res) => {
  const { connectionId } = req.body;
  const connection = await Connection.findOne({ _id: connectionId, receiver: req.user._id });

  if (!connection) {
    return res.status(404).json({ message: "Connection request not found" });
  }

  connection.status = "declined";
  await connection.save();

  await Notification.updateMany(
    {
      recipient: req.user._id,
      type: "connection_request",
      "data.connectionId": connection._id,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  await Notification.create({
    recipient: connection.sender,
    actor: req.user._id,
    type: "connection_declined",
    title: "Connection request ignored",
    message: `${req.user.name} ignored your connection request.`,
    data: {
      connectionId: connection._id,
    },
  });

  res.json({ message: "Connection declined" });
};

export const deleteConnection = async (req, res) => {
  const connection = await Connection.findOne({
    _id: req.params.id,
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
  });

  if (!connection) {
    return res.status(404).json({ message: "Connection not found" });
  }

  const isSender = String(connection.sender) === String(req.user._id);
  const isReceiver = String(connection.receiver) === String(req.user._id);

  if (connection.status === "pending" && !isSender) {
    return res.status(403).json({ message: "Only request sender can cancel pending request" });
  }

  if (!isSender && !isReceiver) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await Notification.deleteMany({
    $or: [
      { "data.connectionId": connection._id, recipient: connection.sender },
      { "data.connectionId": connection._id, recipient: connection.receiver },
    ],
  });

  await connection.deleteOne();
  return res.json({ message: "Connection removed" });
};
