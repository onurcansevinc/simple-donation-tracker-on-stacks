import { toast } from 'react-hot-toast';
import { showConnect, request } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import React, { useState, useEffect } from 'react';
import {
    cvToValue,
    uintCV,
    makeSTXTokenTransfer,
    broadcastTransaction,
    ClarityValue,
    ListCV,
    callReadOnlyFunction,
    createStacksPrivateKey,
    getPublicKey,
} from '@stacks/transactions';

interface Donation {
    id: number;
    amount: number;
    sender: string;
    timestamp: number;
}

interface Statistics {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    lastDonation: Donation | null;
    topDonor: { address: string; amount: number } | null;
}

interface WalletData {
    address: string;
}

// Test verileri
const TEST_DONATIONS: Donation[] = [
    {
        id: 1,
        amount: 10,
        sender: 'ST2W4JFHKFBVGXN2NH5PXJMYZVB9DS40RM9M0MED2',
        timestamp: Math.floor(Date.now() / 1000) - 3600,
    },
    {
        id: 2,
        amount: 5,
        sender: 'ST2W4JFHKFBVGXN2NH5PXJMYZVB9DS40RM9M0MED2',
        timestamp: Math.floor(Date.now() / 1000) - 7200,
    },
];

const Home: React.FC = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userData, setUserData] = useState<WalletData | null>(null);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [donationAmount, setDonationAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);
    const [statistics, setStatistics] = useState<Statistics>({
        totalAmount: 0,
        totalCount: 0,
        averageAmount: 0,
        lastDonation: null,
        topDonor: null,
    });
    const [pendingDonations, setPendingDonations] = useState<Set<string>>(new Set());

    const contractAddress = 'ST2W4JFHKFBVGXN2NH5PXJMYZVB9DS40RM9M0MED2';
    const contractName = 'donation-tracker';

    // Initialize donations when component mounts
    useEffect(() => {
        if (isTestMode) {
            setDonations(TEST_DONATIONS);
            calculateStatistics(TEST_DONATIONS);
        } else {
            setDonations([]);
            calculateStatistics([]);
        }
    }, [isTestMode]);

    const handleConnect = async () => {
        if (isTestMode) {
            // Test modunda cüzdan bağlantısı simülasyonu
            const testUserData: WalletData = {
                address: 'ST2W4JFHKFBVGXN2NH5PXJMYZVB9DS40RM9M0MED2',
            };
            setIsSignedIn(true);
            setUserData(testUserData);
            setDonations(TEST_DONATIONS);
            calculateStatistics(TEST_DONATIONS);
            return;
        }

        try {
            showConnect({
                appDetails: {
                    name: 'Simple Donation Tracker',
                    icon: 'https://example.com/icon.png',
                },
                onFinish: (data: any) => {
                    console.log('Wallet connection data:', data); // Debug log

                    // Stacks Connect'in döndürdüğü veriyi kontrol et
                    if (!data?.authResponsePayload?.profile) {
                        toast.error('Cüzdan bağlantısı başarısız: Profil bilgisi alınamadı');
                        return;
                    }

                    // Testnet adresini al
                    const address = data.authResponsePayload.profile.stxAddress?.testnet;

                    if (!address) {
                        toast.error('Cüzdan bağlantısı başarısız: Testnet adresi bulunamadı');
                        return;
                    }

                    const walletData: WalletData = {
                        address,
                    };

                    console.log('Processed wallet data:', walletData); // Debug log

                    setIsSignedIn(true);
                    setUserData(walletData);
                    toast.success('Cüzdan başarıyla bağlandı!');

                    // Bağlantı başarılı olduktan sonra bağışları getir
                    fetchDonations();
                },
                onCancel: () => {
                    toast.error('Cüzdan bağlantısı kullanıcı tarafından iptal edildi.');
                },
            });
        } catch (error: any) {
            toast.error('Bir hata oluştu: ' + (error.message || error));
            console.error('Error connecting wallet:', error);
        }
    };

    const calculateStatistics = (donations: Donation[]) => {
        if (donations.length === 0) {
            setStatistics({
                totalAmount: 0,
                totalCount: 0,
                averageAmount: 0,
                lastDonation: null,
                topDonor: null,
            });
            return;
        }

        const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);
        const totalCount = donations.length;
        const averageAmount = totalAmount / totalCount;

        // En son bağışı bul
        const lastDonation = [...donations].sort((a, b) => b.timestamp - a.timestamp)[0];

        // En çok bağış yapan kişiyi bul
        const donorMap = new Map<string, number>();
        donations.forEach((donation) => {
            const currentAmount = donorMap.get(donation.sender) || 0;
            donorMap.set(donation.sender, currentAmount + donation.amount);
        });

        const topDonor = Array.from(donorMap.entries())
            .map(([address, amount]) => ({ address, amount }))
            .sort((a, b) => b.amount - a.amount)[0];

        setStatistics({
            totalAmount,
            totalCount,
            averageAmount,
            lastDonation,
            topDonor,
        });
    };

    const fetchDonations = async () => {
        if (isTestMode) {
            setDonations(TEST_DONATIONS);
            calculateStatistics(TEST_DONATIONS);
            return;
        }

        if (!userData?.address) {
            console.error('No user address available for fetching donations');
            return;
        }

        try {
            const donationIds = await callReadOnlyFunction({
                network: new StacksTestnet(),
                contractAddress,
                contractName,
                functionName: 'get-all-donations',
                functionArgs: [],
                senderAddress: userData.address,
            });

            if (!donationIds) {
                console.error('No donation IDs returned from contract');
                return;
            }

            const donationList = await Promise.all(
                (donationIds as ListCV<ClarityValue>).list.map(async (id: ClarityValue) => {
                    const donation = await callReadOnlyFunction({
                        network: new StacksTestnet(),
                        contractAddress,
                        contractName,
                        functionName: 'get-donation',
                        functionArgs: [uintCV(Number(cvToValue(id)))],
                        senderAddress: userData.address,
                    });
                    return {
                        id: Number(cvToValue(id)),
                        ...cvToValue(donation),
                    };
                })
            );

            setDonations(donationList);
            calculateStatistics(donationList);
        } catch (error: any) {
            console.error('Error fetching donations:', error);
            if (error.message?.includes('Failed to parse sender principal')) {
                console.error('Invalid sender address:', userData?.address);
                // Reset state on invalid address
                setIsSignedIn(false);
                setUserData(null);
                setDonations([]);
                calculateStatistics([]);
                toast.error('Geçersiz cüzdan adresi. Lütfen tekrar bağlanın.');
            }
        }
    };

    useEffect(() => {
        if (isSignedIn) {
            fetchDonations();
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (!isSignedIn || !userData?.address) return;

        const checkDonationStatus = async () => {
            try {
                if (!userData?.address) {
                    console.error('No user address available');
                    return;
                }

                const donationIds = await callReadOnlyFunction({
                    network: new StacksTestnet(),
                    contractAddress,
                    contractName,
                    functionName: 'get-all-donations',
                    functionArgs: [],
                    senderAddress: userData.address,
                });

                const donationList = await Promise.all(
                    (donationIds as ListCV<ClarityValue>).list.map(async (id: ClarityValue) => {
                        const donation = await callReadOnlyFunction({
                            network: new StacksTestnet(),
                            contractAddress,
                            contractName,
                            functionName: 'get-donation',
                            functionArgs: [uintCV(Number(cvToValue(id)))],
                            senderAddress: userData.address,
                        });
                        return {
                            id: Number(cvToValue(id)),
                            ...cvToValue(donation),
                        };
                    })
                );

                // Check for confirmed donations
                donationList.forEach((donation) => {
                    if (pendingDonations.has(donation.id.toString())) {
                        toast.success(`Bağışınız onaylandı! ${donation.amount} STX`);
                        setPendingDonations((prev) => {
                            const next = new Set(prev);
                            next.delete(donation.id.toString());
                            return next;
                        });
                    }
                });

                setDonations(donationList);
                calculateStatistics(donationList);
            } catch (error: any) {
                console.error('Error checking donation status:', error);
                if (error.message?.includes('Failed to parse sender principal')) {
                    console.error('Invalid sender address:', userData?.address);
                    // Optionally, you might want to handle this case by signing out the user
                    // setIsSignedIn(false);
                    // setUserData(null);
                }
            }
        };

        const interval = setInterval(checkDonationStatus, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [isSignedIn, pendingDonations, userData?.address]);

    const handleDonate = async () => {
        if (!donationAmount || isNaN(Number(donationAmount))) return;

        // Debug logs
        console.log('Current userData:', userData);
        console.log('Is signed in:', isSignedIn);

        if (!isSignedIn || !userData?.address) {
            toast.error('Lütfen önce cüzdanınızı bağlayın.');
            return;
        }

        setLoading(true);
        try {
            if (isTestMode) {
                const currentDonations = Array.isArray(donations) ? donations : [];
                const newDonation: Donation = {
                    id: currentDonations.length + 1,
                    amount: Number(donationAmount),
                    sender: userData.address,
                    timestamp: Math.floor(Date.now() / 1000),
                };
                const updatedDonations = [newDonation, ...currentDonations];
                setDonations(updatedDonations);
                calculateStatistics(updatedDonations);
                setDonationAmount('');
                toast.success('Test bağışı başarıyla eklendi!');
                return;
            }

            const amount = Number(donationAmount) * 1000000; // Convert to microSTX

            // Yeni Stacks Connect API ile transfer başlat
            await request('stx_transferStx', {
                amount: amount.toString(),
                recipient: contractAddress,
                network: 'testnet',
                memo: 'Donation',
            });
            toast.success('Bağış işlemi başlatıldı, cüzdanınızda onaylayın.');
            // Bağışlar listesini güncelle
            await fetchDonations();
            setDonationAmount('');
        } catch (error: any) {
            console.error('Error making donation:', error);
            if (error.message && error.message.includes('User canceled')) {
                toast.error('İşlem kullanıcı tarafından iptal edildi.');
            } else {
                toast.error('Bir hata oluştu: ' + (error.message || error));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8'>
            <div className='max-w-4xl mx-auto'>
                <div className='text-center mb-12'>
                    <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl'>
                        Simple Donation Tracker
                    </h1>
                    <p className='mt-5 max-w-xl mx-auto text-xl text-gray-500'>
                        Şeffaf ve güvenli bağış takibi için blockchain tabanlı çözüm
                    </p>
                </div>

                <div className='bg-white rounded-2xl shadow-xl overflow-hidden'>
                    <div className='px-6 py-8'>
                        <div className='flex items-center justify-between mb-8'>
                            <div className='flex items-center space-x-3'>
                                <button
                                    type='button'
                                    role='switch'
                                    aria-checked={isTestMode}
                                    onClick={() => {
                                        setIsTestMode(!isTestMode);
                                        if (isSignedIn) {
                                            setIsSignedIn(false);
                                            setUserData(null);
                                            setDonations([]);
                                        }
                                    }}
                                    className={`${
                                        isTestMode ? 'bg-blue-600' : 'bg-gray-200'
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                >
                                    <span
                                        className={`${
                                            isTestMode ? 'translate-x-6' : 'translate-x-1'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                                <span className='text-sm font-medium text-gray-700'>
                                    Test Modu {isTestMode ? '(Açık)' : '(Kapalı)'}
                                </span>
                            </div>
                            {isSignedIn && (
                                <div className='flex items-center space-x-2'>
                                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                    <span className='text-sm text-gray-600'>
                                        {isTestMode ? 'Test Modunda Bağlı' : 'Bağlı'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {!isSignedIn ? (
                            <div className='text-center'>
                                <button
                                    onClick={handleConnect}
                                    className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200'
                                >
                                    <svg className='w-5 h-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth='2'
                                            d='M13 10V3L4 14h7v7l9-11h-7z'
                                        />
                                    </svg>
                                    {isTestMode ? 'Test Modunda Bağlan' : 'Connect Wallet'}
                                </button>
                                {isTestMode && (
                                    <p className='mt-2 text-sm text-gray-500'>
                                        Test modunda gerçek cüzdan bağlantısı olmadan deneyebilirsiniz
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className='space-y-8'>
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                                    <div className='bg-blue-50 rounded-lg p-4'>
                                        <h3 className='text-sm font-medium text-blue-600'>Toplam Bağış</h3>
                                        <p className='mt-2 text-2xl font-semibold text-blue-900'>
                                            {statistics.totalAmount} STX
                                        </p>
                                    </div>
                                    <div className='bg-green-50 rounded-lg p-4'>
                                        <h3 className='text-sm font-medium text-green-600'>Bağış Sayısı</h3>
                                        <p className='mt-2 text-2xl font-semibold text-green-900'>
                                            {statistics.totalCount}
                                        </p>
                                    </div>
                                    <div className='bg-purple-50 rounded-lg p-4'>
                                        <h3 className='text-sm font-medium text-purple-600'>Ortalama Bağış</h3>
                                        <p className='mt-2 text-2xl font-semibold text-purple-900'>
                                            {statistics.averageAmount.toFixed(2)} STX
                                        </p>
                                    </div>
                                    <div className='bg-yellow-50 rounded-lg p-4'>
                                        <h3 className='text-sm font-medium text-yellow-600'>En Yüksek Bağış</h3>
                                        <p className='mt-2 text-2xl font-semibold text-yellow-900'>
                                            {statistics.topDonor?.amount || 0} STX
                                        </p>
                                    </div>
                                </div>

                                {statistics.lastDonation && (
                                    <div className='bg-gray-50 rounded-lg p-4'>
                                        <h3 className='text-sm font-medium text-gray-600'>Son Bağış</h3>
                                        <div className='mt-2'>
                                            <p className='text-lg font-semibold text-gray-900'>
                                                {statistics.lastDonation.amount} STX
                                            </p>
                                            <p className='text-sm text-gray-500'>{statistics.lastDonation.sender}</p>
                                            <p className='text-sm text-gray-500'>
                                                {new Date(statistics.lastDonation.timestamp * 1000).toLocaleString(
                                                    'tr-TR'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className='bg-gray-50 rounded-lg p-6'>
                                    <div className='flex items-center space-x-4'>
                                        <div className='flex-1'>
                                            <input
                                                type='number'
                                                value={donationAmount}
                                                onChange={(e) => setDonationAmount(e.target.value)}
                                                placeholder='STX miktarı girin'
                                                className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
                                            />
                                        </div>
                                        <button
                                            onClick={handleDonate}
                                            disabled={loading}
                                            className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                                        >
                                            {loading ? (
                                                <>
                                                    <svg
                                                        className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                                                        xmlns='http://www.w3.org/2000/svg'
                                                        fill='none'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <circle
                                                            className='opacity-25'
                                                            cx='12'
                                                            cy='12'
                                                            r='10'
                                                            stroke='currentColor'
                                                            strokeWidth='4'
                                                        ></circle>
                                                        <path
                                                            className='opacity-75'
                                                            fill='currentColor'
                                                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                                        ></path>
                                                    </svg>
                                                    İşleniyor...
                                                </>
                                            ) : (
                                                <>
                                                    <svg
                                                        className='w-5 h-5 mr-2'
                                                        fill='none'
                                                        stroke='currentColor'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <path
                                                            strokeLinecap='round'
                                                            strokeLinejoin='round'
                                                            strokeWidth='2'
                                                            d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                                                        />
                                                    </svg>
                                                    Bağış Yap
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h2 className='text-2xl font-bold text-gray-900 mb-6'>Son Bağışlar</h2>
                                    <div className='space-y-4'>
                                        {donations.map((donation) => (
                                            <div
                                                key={donation.id}
                                                className='bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200'
                                            >
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center space-x-3'>
                                                        <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                                                            <svg
                                                                className='w-6 h-6 text-blue-600'
                                                                fill='none'
                                                                stroke='currentColor'
                                                                viewBox='0 0 24 24'
                                                            >
                                                                <path
                                                                    strokeLinecap='round'
                                                                    strokeLinejoin='round'
                                                                    strokeWidth='2'
                                                                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                                                />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className='text-lg font-semibold text-gray-900'>
                                                                {donation.amount} STX
                                                            </p>
                                                            <p className='text-sm text-gray-500'>{donation.sender}</p>
                                                        </div>
                                                    </div>
                                                    <div className='text-right'>
                                                        <p className='text-sm text-gray-500'>
                                                            {new Date(donation.timestamp * 1000).toLocaleString(
                                                                'tr-TR',
                                                                {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                }
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
