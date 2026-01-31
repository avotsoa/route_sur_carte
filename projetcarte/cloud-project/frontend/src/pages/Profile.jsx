import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Save, X, CheckCircle } from 'lucide-react';

function Profile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const hasChanges = 
    formData.first_name !== user?.first_name || 
    formData.last_name !== user?.last_name;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) return;

    setLoading(true);
    try {
      await updateProfile(formData);
      setMessage('Profil mis à jour');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon Profil</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-md flex items-center ${
          message.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        }`}>
          <CheckCircle className="w-5 h-5 mr-2" />
          {message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 p-4 rounded-full">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mt-1">
                  {user?.role}
                </span>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition"
              >
                Modifier
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 py-2">{user?.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 py-2">{user?.last_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Adresse e-mail (non modifiable)
            </label>
            <p className="text-gray-500 py-2 bg-gray-50 px-3 rounded-md">{user?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UID
            </label>
            <p className="text-gray-500 py-2 bg-gray-50 px-3 rounded-md font-mono text-sm">
              {user?.uid}
            </p>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
              <button
                type="submit"
                disabled={!hasChanges || loading}
                className={`px-4 py-2 rounded-md text-white flex items-center transition ${
                  hasChanges && !loading
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="spinner mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Sauvegarder
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Profile;
