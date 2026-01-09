import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./NewPollStyles.css";

const NewPoll = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    options: ["", ""], // Start with 2 empty options
    expiresAt: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleOptionChange = (index, value) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return {
        ...prev,
        options: newOptions,
      };
    });
    // Clear error when user starts typing
    if (errors.options) {
      setErrors((prev) => ({
        ...prev,
        options: "",
      }));
    }
  };

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length <= 2) {
      return; // Don't allow removing if only 2 options remain
    }
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Poll name is required";
    }

    const validOptions = formData.options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
    
    if (validOptions.length < 2) {
      newErrors.options = "At least 2 options are required";
    }

    // Check for duplicate options
    const uniqueOptions = new Set(validOptions);
    if (uniqueOptions.size !== validOptions.length) {
      newErrors.options = "Options must be unique";
    }

    if (formData.expiresAt && new Date(formData.expiresAt) < new Date()) {
      newErrors.expiresAt = "Expiration date must be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const optionsArray = formData.options
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);

      await axios.post(
        `${API_URL}/api/polls`,
        {
          name: formData.name,
          options: optionsArray,
          expiresAt: formData.expiresAt || null,
        },
        {
          withCredentials: true,
        }
      );

      navigate("/polls");
    } catch (error) {
      console.error("Error creating poll:", error);
      setErrors({
        general: error.response?.data?.error || "Failed to create poll",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/polls");
  };

  return (
    <div className="new-poll-container">
      <div className="poll-form-card">
        <h2>Create New Poll</h2>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Poll Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
              placeholder="Enter poll name"
            />
            {errors.name && (
              <span className="error-text">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label>Poll Options:</label>
            {formData.options.map((option, index) => (
              <div key={index} className="option-input-group">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className={errors.options ? "error" : ""}
                  placeholder={`Option ${index + 1}`}
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    className="remove-option-btn"
                    onClick={() => handleRemoveOption(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-option-btn"
              onClick={handleAddOption}
            >
              New Option
            </button>
            {errors.options && (
              <span className="error-text">{errors.options}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expiresAt">Expiration Date (Optional):</label>
            <input
              type="datetime-local"
              id="expiresAt"
              name="expiresAt"
              value={formData.expiresAt}
              onChange={handleChange}
              className={errors.expiresAt ? "error" : ""}
            />
            {errors.expiresAt && (
              <span className="error-text">{errors.expiresAt}</span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPoll;
