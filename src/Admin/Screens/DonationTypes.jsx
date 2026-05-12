import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../services/axios';

const DonationTypes = () => {
  const [donationTypes, setDonationTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentType, setCurrentType] = useState({
    id: null,
    donationType: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDonationTypes();
  }, []);

  const fetchDonationTypes = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/donationtypes');
      if (response.data.success) {
        setDonationTypes(response.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error fetching donation types');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setEditMode(false);
    setCurrentType({ id: null, donationType: '' });
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentType({ id: null, donationType: '' });
  };

  const handleEdit = (type) => {
    setCurrentType({
      id: type._id,
      donationType: type.donationType
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this donation type?')) {
      try {
        const response = await axiosInstance.delete(`/donationtypes/${id}`);
        if (response.data.success) {
          toast.success('Donation type deleted successfully');
          fetchDonationTypes();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting donation type');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        const response = await axiosInstance.put(`/donationtypes/${currentType.id}`, {
          donationType: currentType.donationType
        });
        if (response.data.success) {
          toast.success('Donation type updated successfully');
          handleClose();
          fetchDonationTypes();
        }
      } else {
        const response = await axiosInstance.post('/donationtypes', {
          donationType: currentType.donationType
        });
        if (response.data.success) {
          toast.success('Donation type created successfully');
          handleClose();
          fetchDonationTypes();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving donation type');
    }
  };

  const handleChange = (e) => {
    setCurrentType({
      ...currentType,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Donation Types</h1>
        <button
          onClick={handleOpen}
          className="px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8952F] transition-colors"
        >
          Add New Donation Type
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Donation Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : donationTypes.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                  No donation types found
                </td>
              </tr>
            ) : (
              donationTypes.map((type) => (
                <tr key={type._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {type.donationType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-[#C9A84C] hover:text-blue-900 mr-4"
                    >
                      <FiEdit2 className="inline-block w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(type._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 className="inline-block w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editMode ? 'Edit Donation Type' : 'Add New Donation Type'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Donation Type
                </label>
                <input
                  type="text"
                  name="donationType"
                  value={currentType.donationType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  required
                  maxLength={100}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {currentType.donationType.length}/100 characters
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8952F] transition-colors"
                >
                  {editMode ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationTypes; 