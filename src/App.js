import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, AlertTriangle, Clock, DollarSign, ArrowUpDown } from 'lucide-react';
import './App.css';

function App() {
    const [cryptos, setCryptos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [arbitrageOpportunities, setArbitrageOpportunities] = useState([]);

    // Get top 50 cryptocurrencies
    const getTopCryptos = async () => {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 50,
                    page: 1,
                    sparkline: false
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching top cryptos:', error);
            return [];
        }
    };

    // Get price from Binance
    const getBinancePrice = async (symbol) => {
        try {
            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
            return parseFloat(response.data.price);
        } catch (error) {
            return null;
        }
    };

    // Get price from Coinbase
    const getCoinbasePrice = async (symbol) => {
        try {
            const response = await axios.get(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`);
            return parseFloat(response.data.data.amount);
        } catch (error) {
            return null;
        }
    };

    // Get price from Kraken
    const getKrakenPrice = async (symbol) => {
        try {
            const specialCases = { "BTC": "XBT", "DOGE": "XDG", "USDT": "USDTZ" };
            const krakenSymbol = specialCases[symbol] || symbol;
            const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}USD`);

            if (response.data.result && Object.keys(response.data.result).length > 0) {
                const pair = Object.keys(response.data.result)[0];
                return parseFloat(response.data.result[pair].c[0]);
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    // Detect arbitrage opportunities
    const detectArbitrage = (prices, name) => {
        const values = Object.values(prices).filter(v => v !== null && v > 0.01 && v < 100000);
        if (values.length < 2) return null;

        const minPrice = Math.min(...values);
        const maxPrice = Math.max(...values);
        const diff = (maxPrice - minPrice) / minPrice;

        if (diff >= 0.01) {
            return {
                name,
                minPrice,
                maxPrice,
                spread: diff * 100,
                isError: diff >= 0.5
            };
        }
        return null;
    };

    // Fetch crypto data
    const fetchCryptoData = async () => {
        const topCryptos = await getTopCryptos();
        const cryptoData = [];
        const opportunities = [];

        for (const crypto of topCryptos.slice(0, 20)) { // Limit to 20 for performance
            const symbol = crypto.symbol.toUpperCase();

            const [binancePrice, coinbasePrice, krakenPrice] = await Promise.all([
                getBinancePrice(symbol),
                getCoinbasePrice(symbol),
                getKrakenPrice(symbol)
            ]);

            const prices = {
                Binance: binancePrice,
                Coinbase: coinbasePrice,
                Kraken: krakenPrice
            };

            const arbitrage = detectArbitrage(prices, crypto.name);
            if (arbitrage) {
                opportunities.push(arbitrage);
            }

            cryptoData.push({
                ...crypto,
                prices,
                arbitrage
            });
        }

        setCryptos(cryptoData);
        setArbitrageOpportunities(opportunities);
        setLastUpdate(new Date());
    };

    useEffect(() => {
        const initialLoad = async () => {
            setLoading(true);
            await fetchCryptoData();
            setLoading(false);
        };

        initialLoad();
        const interval = setInterval(fetchCryptoData, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        if (!price) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(price);
    };

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <h1><TrendingUp className="header-icon" /> Crypto Arbitrage Tracker</h1>
                    <p>Monitor cryptocurrency prices across exchanges and spot arbitrage opportunities</p>
                    <div className="last-update">
                        <Clock size={16} />
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>
            </header>

           

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading cryptocurrency data...</p>
                </div>
            ) : (
                <div className="content">
                    {/* Arbitrage Opportunities */}
                    {arbitrageOpportunities.length > 0 && (
                        <div className="arbitrage-section">
                            <h2><ArrowUpDown className="section-icon" /> Arbitrage Opportunities</h2>
                            <div className="opportunities-grid">
                                {arbitrageOpportunities.map((opp, index) => (
                                    <div key={index} className={`opportunity-card ${opp.isError ? 'error' : 'alert'}`}>
                                        <h3>{opp.name}</h3>
                                        <div className="opportunity-details">
                                            <p><strong>Buy at:</strong> {formatPrice(opp.minPrice)}</p>
                                            <p><strong>Sell at:</strong> {formatPrice(opp.maxPrice)}</p>
                                            <p className={`spread ${opp.isError ? 'error-text' : 'alert-text'}`}>
                                                <strong>Spread:</strong> {opp.spread.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Crypto Price Table */}
                    <div className="crypto-section">
                        <h2><DollarSign className="section-icon" /> Cryptocurrency Prices</h2>
                        <div className="crypto-grid">
                            {cryptos.map((crypto) => (
                                <div key={crypto.id} className="crypto-card">
                                    <div className="crypto-header">
                                        <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
                                        <div>
                                            <h3>{crypto.name}</h3>
                                            <p className="crypto-symbol">{crypto.symbol.toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="price-list">
                                        {crypto.prices.Binance && (
                                            <div className="price-item">
                                                <span className="exchange">Binance</span>
                                                <span className="price">{formatPrice(crypto.prices.Binance)}</span>
                                            </div>
                                        )}
                                        {crypto.prices.Coinbase && (
                                            <div className="price-item">
                                                <span className="exchange">Coinbase</span>
                                                <span className="price">{formatPrice(crypto.prices.Coinbase)}</span>
                                            </div>
                                        )}
                                        {crypto.prices.Kraken && (
                                            <div className="price-item">
                                                <span className="exchange">Kraken</span>
                                                <span className="price">{formatPrice(crypto.prices.Kraken)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {crypto.arbitrage && (
                                        <div className={`arbitrage-indicator ${crypto.arbitrage.isError ? 'error' : 'alert'}`}>
                                            {crypto.arbitrage.isError ? '⚠️ Possible Error' : '💰 Arbitrage Opportunity'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App; 