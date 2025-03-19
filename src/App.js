import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./abi.json";
import "./App.css";

// Smart Contract Details
const CONTRACT_ADDRESS = "0xb7cE37102a7b41e47310cAae054C45014cEF1278";
const CONTRACT_ABI = abi;

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Connect Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        
        const taskContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(taskContract);
        fetchTasks(taskContract);
      } catch (error) {
        console.error("Wallet connection failed:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setTasks([]);
  
    // Clear provider state to force reconnection
    if (window.ethereum) {
      window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      }).catch((err) => console.log("Error revoking permissions:", err));
    }
  };

  // Fetch tasks from the smart contract
  const fetchTasks = async (contract) => {
    if (!contract) return;
    try {
      const tasksList = await contract.getAllTask();
      setTasks(tasksList.map((t, index) => ({
        id: index + 1,
        title: t.title,
        description: t.description,
        completed: t.completed,
      })));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // Add new task on-chain
  const addTask = async () => {
    if (!contract || !title.trim() || !description.trim()) return;
    try {
      const tx = await contract.createNewTask(title, description);
      await tx.wait();
      setTitle("");
      setDescription("");
      fetchTasks(contract);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Complete a task
  const toggleCompletion = async (id) => {
    if (!contract) return;
    try {
      const tx = await contract.completeTask(id);
      await tx.wait();
      fetchTasks(contract);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // Delete a task
  const deleteTask = async (id) => {
    if (!contract) return;
    try {
      const tx = await contract.deleteTask(id);
      await tx.wait();
      fetchTasks(contract);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Open edit modal
  const openEditModal = (task) => {
    setIsEditing(true);
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditing(false);
    setEditTaskId(null);
    setEditTitle("");
    setEditDescription("");
  };

  // Update task on-chain
  const editTask = async () => {
    if (!contract || !editTaskId || !editTitle.trim() || !editDescription.trim()) return;
    try {
      const tx = await contract.editTask(editTaskId, editTitle, editDescription);
      await tx.wait();
      closeEditModal();
      fetchTasks(contract);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          // If user disconnects their wallet
          disconnectWallet();
        } else {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          const newSigner = await newProvider.getSigner();
          const newContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
  
          setProvider(newProvider);
          setSigner(newSigner);
          setContract(newContract);
          setAccount(accounts[0]); // Update account state
          fetchTasks(newContract); // Fetch tasks for the new account
        }
      };
  
      // Listen for account change
      window.ethereum.on("accountsChanged", handleAccountsChanged);
  
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Task Manager</h1>
        {account ? (
          <button className="disconnect-btn" onClick={disconnectWallet}>
            Disconnect ({account.slice(0, 6)}...{account.slice(-4)})
          </button>
        ) : (
          <button className="connect-wallet" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </header>

      <div className="task-container">
        <div className="task-input">
          <h2>Add New Task</h2>
          <input
            type="text"
            placeholder="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Task Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="add-task-btn" onClick={addTask}>
            + Add Task
          </button>
        </div>

        <div className="task-list">
          <h2>Your Tasks</h2>
          {tasks.length === 0 ? (
            <p className="no-task-msg">No tasks yet.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className={`task-card ${task.completed ? "completed" : ""}`}>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <div className="task-actions">
                  <button className="edit-btn" onClick={() => openEditModal(task)}>Edit</button>
                  <button className="complete-btn" onClick={() => toggleCompletion(task.id)}>
                    {task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                  </button>
                  <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Task</h2>
            <input
              type="text"
              placeholder="New Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <textarea
              placeholder="New Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="modal-actions">
              <button className="save-btn" onClick={editTask}>Save</button>
              <button className="cancel-btn" onClick={closeEditModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
