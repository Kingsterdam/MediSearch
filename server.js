const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// OpenFDA base URL
const FDA_BASE_URL = 'https://api.fda.gov/drug';

// Utility function to format the response
const formatDrugInfo = (data) => {
    const drugInfo = data.results[0];
    return {
        brandName: drugInfo.openfda.brand_name?.[0] || 'Not available',
        genericName: drugInfo.openfda.generic_name?.[0] || 'Not available',
        purpose: drugInfo.purpose?.[0] || 'Not available',
        indications: drugInfo.indications_and_usage?.[0] || 'Not available',
        warnings: drugInfo.warnings?.[0] || 'Not available',
        sideEffects: drugInfo.adverse_reactions?.[0] || 'Not available',
        dosage: drugInfo.dosage_and_administration?.[0] || 'Not available',
        interactions: drugInfo.drug_interactions?.[0] || 'Not available',
    };
};

// Search medicine by name
app.get('/api/medicine/search', async (req, res) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ error: 'Medicine name is required' });
        }

        const response = await axios.get(`${FDA_BASE_URL}/label.json`, {
            params: {
                search: `openfda.brand_name:"${name}" OR openfda.generic_name:"${name}"`,
                limit: 1
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const formattedData = formatDrugInfo(response.data);
            res.json(formattedData);
        } else {
            res.status(404).json({ error: 'Medicine not found' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response?.status === 404) {
            res.status(404).json({ error: 'Medicine not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Get detailed information about specific side effects
app.get('/api/medicine/side-effects', async (req, res) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ error: 'Medicine name is required' });
        }

        const response = await axios.get(`${FDA_BASE_URL}/event.json`, {
            params: {
                search: `patient.drug.medicinalproduct:"${name}"`,
                limit: 10
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const sideEffects = response.data.results.map(result => ({
                reactions: result.patient?.reaction?.map(r => ({
                    symptom: r.reactionmeddrapt,
                    outcome: r.reactionoutcome
                })) || [],
                seriousness: result.serious,
                reportedDate: result.receiptdate
            }));
            
            res.json(sideEffects);
        } else {
            res.status(404).json({ error: 'No side effects data found' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});