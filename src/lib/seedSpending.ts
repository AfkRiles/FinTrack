import { parseEtherfiCSV, importTransactions } from './spendingParser'
import { db } from './db'

// Historical Ether.fi data (May–Oct 2026) — seeded once on first run
const HISTORICAL_CSV = `timestamp,type,description,status,amount,currency,card,card holder name,original amount,original currency,cashback earned,cashback currency,category,spending mode
2026-10-31 23:59:59 UTC,affiliate_reward,affiliate_reward,pending,0.93,USD,,,,,,,,
2026-10-31 19:23:49 UTC,card_spend,KRONENDAL HOMESTEAD      ,CLEARED,32.41,USD,0136,RILEY BLUE WATSON,530,ZAR,0.97,USD,Eating Places and Restaurants,Direct Pay
2026-10-31 18:36:40 UTC,card_spend,KRONENDAL HOMESTEAD      ,CLEARED,5.5,USD,0136,RILEY BLUE WATSON,90,ZAR,0.16,USD,Eating Places and Restaurants,Direct Pay
2026-10-31 14:39:36 UTC,card_spend,PAYFAST*admyt            ,CLEARED,1.29,USD,0136,RILEY BLUE WATSON,21,ZAR,0.04,USD,"Computers, Computer Peripheral Equipment, and Software ",Direct Pay
2026-10-31 14:30:37 UTC,card_spend,MrPriceH V&A Waterfron   ,CLEARED,21.41,USD,0136,RILEY BLUE WATSON,349.99,ZAR,0.64,USD,Miscellaneous Home Furnishing Specialty Stores,Direct Pay
2026-10-31 14:12:43 UTC,card_spend,CLICKS V&A WATERFRONT    ,CLEARED,5,USD,0136,RILEY BLUE WATSON,81.9,ZAR,0.15,USD,Drug Stores and Pharmacies,Direct Pay
2026-10-31 14:04:37 UTC,card_spend,TASHA ' S                ,CLEARED,11.01,USD,0136,RILEY BLUE WATSON,180,ZAR,0.33,USD,Eating Places and Restaurants,Direct Pay
2026-10-31 09:36:52 UTC,card_spend,BOOTLEGGER BAKOVEN - GA  ,CLEARED,23.25,USD,0136,RILEY BLUE WATSON,380,ZAR,0.70,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-30 18:09:41 UTC,card_spend,Yoco   *Labia Terrace    ,CLEARED,9.03,USD,0136,RILEY BLUE WATSON,148,ZAR,0.27,USD,Motion Picture Theater,Direct Pay
2026-10-30 09:53:01 UTC,card_spend,GIOVANNI'S               ,CLEARED,16.36,USD,0136,RILEY BLUE WATSON,267,ZAR,0.49,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-28 18:25:47 UTC,card_spend,THAI SUSHI CORNER        ,CLEARED,15.92,USD,0136,RILEY BLUE WATSON,260,ZAR,0.48,USD,Eating Places and Restaurants,Direct Pay
2026-10-28 13:18:29 UTC,card_spend,PAYFAST*admyt            ,CLEARED,0.98,USD,0136,RILEY BLUE WATSON,16,ZAR,0.03,USD,"Computers, Computer Peripheral Equipment, and Software ",Direct Pay
2026-10-28 12:57:44 UTC,card_spend,Yoco   *Kleinskys VA     ,CLEARED,24.49,USD,0136,RILEY BLUE WATSON,400,ZAR,0.73,USD,Eating Places and Restaurants,Direct Pay
2026-10-27 10:30:56 UTC,card_spend,GIOVANNI'S               ,CLEARED,6.42,USD,0136,RILEY BLUE WATSON,104.8,ZAR,0.19,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-26 16:56:07 UTC,card_spend,ENGEN ORANJE SERVICE STA ,CLEARED,3.99,USD,0136,RILEY BLUE WATSON,64.99,ZAR,0.12,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-10-26 11:08:39 UTC,card_spend,STR PARKING CT 84        ,CLEARED,0.21,USD,0136,RILEY BLUE WATSON,3.4,ZAR,0.01,USD,Parking Lots and Garages,Direct Pay
2026-10-26 11:06:41 UTC,card_spend,Spar Cape Quarter        ,CLEARED,30.42,USD,0136,RILEY BLUE WATSON,495.75,ZAR,0.91,USD,"Package Stores--Beer, Wine, and Liquor",Direct Pay
2026-10-26 09:31:45 UTC,card_spend,SHELL PADDY ' S SERVICE C,CLEARED,48.22,USD,0136,RILEY BLUE WATSON,781.8,ZAR,1.45,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-10-25 17:57:13 UTC,card_spend,MUGG AND BEAN WATERFRONT ,CLEARED,29.9,USD,0136,RILEY BLUE WATSON,485,ZAR,0.90,USD,Eating Places and Restaurants,Direct Pay
2026-10-25 10:36:10 UTC,card_spend,Yoco   *De Tol Piekeni   ,CLEARED,8.64,USD,0136,RILEY BLUE WATSON,140,ZAR,0.26,USD,Eating Places and Restaurants,Direct Pay
2026-10-25 10:05:25 UTC,card_spend,Yoco   *De Tol Piekeni   ,CLEARED,2.16,USD,0136,RILEY BLUE WATSON,35,ZAR,0.06,USD,Eating Places and Restaurants,Direct Pay
2026-10-25 10:03:38 UTC,card_spend,Yoco   *De Tol Piekeni   ,CLEARED,4.31,USD,0136,RILEY BLUE WATSON,70,ZAR,0.13,USD,Eating Places and Restaurants,Direct Pay
2026-10-25 07:38:10 UTC,card_spend,Yoco   *Rocklands Base   ,CLEARED,22.2,USD,0136,RILEY BLUE WATSON,360,ZAR,0.67,USD,Trailer Parks and Campgrounds,Direct Pay
2026-10-24 14:42:19 UTC,card_spend,DE PAKHUYS BOER  216634  ,CLEARED,20.24,USD,0136,RILEY BLUE WATSON,328.26,ZAR,0.61,USD,Lodging,Direct Pay
2026-10-24 12:11:40 UTC,card_spend,DE PAKHUYS BOER  216634  ,CLEARED,6.35,USD,0136,RILEY BLUE WATSON,103,ZAR,0.19,USD,Lodging,Direct Pay
2026-10-23 14:36:53 UTC,card_spend,STR PARKING CT 30        ,CLEARED,0.29,USD,0136,RILEY BLUE WATSON,4.8,ZAR,0.01,USD,Parking Lots and Garages,Direct Pay
2026-10-22 14:34:23 UTC,card_spend,ZARA WATERFRONT 132861   ,CLEARED,59.32,USD,0136,RILEY BLUE WATSON,959,ZAR,1.78,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-22 10:13:29 UTC,card_spend,Giovanni Esposito        ,CLEARED,10.62,USD,0136,RILEY BLUE WATSON,170.9,ZAR,0.32,USD,Eating Places and Restaurants,Direct Pay
2026-10-22 09:47:40 UTC,card_spend,SHELL PADDY ' S SERVICE C,CLEARED,30.05,USD,0136,RILEY BLUE WATSON,483.3,ZAR,0.90,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-10-20 11:11:52 UTC,card_spend,Spar Cape Quarter        ,CLEARED,67.06,USD,0136,RILEY BLUE WATSON,1083.99,ZAR,2.01,USD,"Package Stores--Beer, Wine, and Liquor",Direct Pay
2026-10-18 07:29:24 UTC,card_spend,Yoco   *Achla            ,CLEARED,9.91,USD,0136,RILEY BLUE WATSON,160,ZAR,0.30,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-18 07:24:32 UTC,card_spend,Yoco   *Strawbabies      ,CLEARED,4.95,USD,0136,RILEY BLUE WATSON,80,ZAR,0.15,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-17 13:45:03 UTC,topup,USDT,,500,USD,,,500,USDT,,,,
2026-10-17 10:16:26 UTC,card_spend,PAYFAST*admyt            ,CLEARED,0.68,USD,0136,RILEY BLUE WATSON,11,ZAR,0.02,USD,"Computers, Computer Peripheral Equipment, and Software ",Direct Pay
2026-10-17 10:11:54 UTC,card_spend,CLICKS GARDENS CENTRE    ,CLEARED,13.61,USD,0136,RILEY BLUE WATSON,220,ZAR,0.41,USD,Drug Stores and Pharmacies,Direct Pay
2026-10-17 09:22:20 UTC,card_spend,Yoco   *Michelles Vill   ,CLEARED,26.61,USD,0136,RILEY BLUE WATSON,430,ZAR,0.80,USD,Eating Places and Restaurants,Direct Pay
2026-10-16 19:49:29 UTC,card_spend,Yoco   *BILLY BOYS AND   ,CLEARED,20.54,USD,0136,RILEY BLUE WATSON,333.3,ZAR,0.62,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-16 13:54:46 UTC,card_spend,PAYFAST*admyt            ,CLEARED,1.91,USD,0136,RILEY BLUE WATSON,31,ZAR,0.06,USD,"Computers, Computer Peripheral Equipment, and Software ",Direct Pay
2026-10-16 13:45:05 UTC,card_spend,SEVRUGA                  ,CLEARED,31.74,USD,0136,RILEY BLUE WATSON,515,ZAR,0.95,USD,Eating Places and Restaurants,Direct Pay
2026-10-16 12:07:36 UTC,card_spend,EDGE FOR MEN             ,CLEARED,19.11,USD,0136,RILEY BLUE WATSON,310,ZAR,0.57,USD,Beauty and Barber Shops,Direct Pay
2026-10-16 11:23:22 UTC,card_spend,H&M V&A Waterfront       ,CLEARED,59.04,USD,0136,RILEY BLUE WATSON,958,ZAR,1.77,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-16 11:04:26 UTC,card_spend,H&M V&A Waterfront       ,CLEARED,34.57,USD,0136,RILEY BLUE WATSON,561,ZAR,1.04,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-16 10:29:45 UTC,card_spend,STR PARKING CT 103       ,CLEARED,0.59,USD,0136,RILEY BLUE WATSON,9.6,ZAR,0.02,USD,Parking Lots and Garages,Direct Pay
2026-10-16 10:01:10 UTC,card_spend,Yoco   *ROUTINE CAFE     ,CLEARED,5.48,USD,0136,RILEY BLUE WATSON,89,ZAR,0.16,USD,Eating Places and Restaurants,
2026-10-15 18:50:17 UTC,affiliate_payout,USDC,,5.14,USD,,,5.14,USDC,,,,
2026-10-14 17:05:20 UTC,card_spend,Yoco   *Lucky Lou        ,CLEARED,9.83,USD,0136,RILEY BLUE WATSON,160,ZAR,0.29,USD,Eating Places and Restaurants,Direct Pay
2026-10-14 11:30:11 UTC,card_spend,JASON BAKERY GREENPOIN   ,CLEARED,2.34,USD,0136,RILEY BLUE WATSON,38,ZAR,0.07,USD,Bakeries,Direct Pay
2026-10-14 09:18:55 UTC,card_spend,Jack Hammers Gardens     ,CLEARED,1.85,USD,0136,RILEY BLUE WATSON,30,ZAR,0.06,USD,"Hardware Stores, Equipment Utilities Regulated",Direct Pay
2026-10-13 19:29:13 UTC,card_spend,KIOSK                    ,CLEARED,13.75,USD,0136,RILEY BLUE WATSON,223,ZAR,0.41,USD,Eating Places and Restaurants,Direct Pay
2026-10-13 19:06:53 UTC,card_spend,CARLYLES         330576  ,CLEARED,17.57,USD,0136,RILEY BLUE WATSON,285,ZAR,0.53,USD,Eating Places and Restaurants,Direct Pay
2026-10-11 13:53:02 UTC,card_spend,DIXIES - GAAP PAX        ,CLEARED,13.86,USD,0136,RILEY BLUE WATSON,225,ZAR,0.42,USD,Eating Places and Restaurants,Direct Pay
2026-10-10 22:07:36 UTC,card_spend,Yoco   *NY Slice Kloof   ,CLEARED,9.79,USD,0136,RILEY BLUE WATSON,159,ZAR,0.29,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-10 21:19:20 UTC,card_spend,Yoco   *The Athletic C   ,CLEARED,26.07,USD,0136,RILEY BLUE WATSON,423.5,ZAR,0.78,USD,Drinking Places,Direct Pay
2026-10-10 20:00:56 UTC,card_spend,Yoco   *Acs              ,CLEARED,6.15,USD,0136,RILEY BLUE WATSON,100,ZAR,0.18,USD,Drinking Places,Direct Pay
2026-10-10 13:47:09 UTC,card_spend,AEA MANAGEMENT PTY LTD   ,CLEARED,6.15,USD,0136,RILEY BLUE WATSON,100,ZAR,0.18,USD,Miscellaneous Personal Services,Direct Pay
2026-10-10 10:58:21 UTC,card_spend,NFS Kenilworth           ,CLEARED,67.72,USD,0136,RILEY BLUE WATSON,1099.95,ZAR,2.03,USD,Family Clothing Stores,Direct Pay
2026-10-10 09:57:19 UTC,card_spend,Vida E Caffe - Access    ,CLEARED,8.06,USD,0136,RILEY BLUE WATSON,131,ZAR,0.24,USD,Eating Places and Restaurants,Direct Pay
2026-10-10 09:46:19 UTC,card_spend,Yoco   *Millers corn c   ,CLEARED,3.7,USD,0136,RILEY BLUE WATSON,60,ZAR,0.11,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-09 18:40:36 UTC,card_spend,BEST OF ASIA GREENPOINT  ,CLEARED,37.54,USD,0136,RILEY BLUE WATSON,37.35,ZAR,1.13,USD,Eating Places and Restaurants,Direct Pay
2026-10-09 11:21:53 UTC,card_spend,KABLOOM          342206  ,CLEARED,7.36,USD,0136,RILEY BLUE WATSON,120,ZAR,0.22,USD,Florists,Direct Pay
2026-10-09 11:19:28 UTC,card_spend,Giovanni Esposito        ,CLEARED,11.34,USD,0136,RILEY BLUE WATSON,184.9,ZAR,0.34,USD,Eating Places and Restaurants,Direct Pay
2026-10-07 11:59:19 UTC,card_spend,STR PARKING CT 3         ,CLEARED,1.77,USD,0136,RILEY BLUE WATSON,28.8,ZAR,0.05,USD,Parking Lots and Garages,Direct Pay
2026-10-07 11:57:13 UTC,card_spend,WOOLWORTHS               ,CLEARED,31.34,USD,0136,RILEY BLUE WATSON,510.85,ZAR,0.94,USD,Grocery Stores and Supermarkets,Direct Pay
2026-10-07 10:36:11 UTC,card_spend,NANDOS SEAPOINT RESTCO   ,CLEARED,10.55,USD,0136,RILEY BLUE WATSON,172,ZAR,0.32,USD,Eating Places and Restaurants,Direct Pay
2026-10-07 06:54:16 UTC,card_spend,DL*Playtomic SA          ,CLEARED,11.71,USD,0136,RILEY BLUE WATSON,189.8,ZAR,0.35,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-10-05 09:00:12 UTC,card_spend,PAYFAST*Trialadmyt       ,CANCELLED,0.06,USD,0136,RILEY BLUE WATSON,1,ZAR,0,,"Computers, Computer Peripheral Equipment, and Software ",Direct Pay
2026-10-04 18:02:29 UTC,card_spend,MUGG AND BEAN WATERFRONT ,CLEARED,9.2,USD,0136,RILEY BLUE WATSON,150,ZAR,0.28,USD,Eating Places and Restaurants,Direct Pay
2026-10-04 16:44:06 UTC,card_spend,COTTON ON V&A WATERFRON  ,CLEARED,121.4,USD,0136,RILEY BLUE WATSON,1980,ZAR,3.64,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-04 14:58:01 UTC,card_spend,ZARA WATERFRONT 132861   ,CLEARED,383.5,USD,0136,RILEY BLUE WATSON,6254.5,ZAR,11.50,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-03 15:59:42 UTC,card_spend,iK *Hamachi Claremont    ,CLEARED,18.39,USD,0136,RILEY BLUE WATSON,300,ZAR,0.55,USD,Eating Places and Restaurants,Direct Pay
2026-10-03 12:13:37 UTC,card_spend,Yoco   *Gravity One Cl   ,CLEARED,6.13,USD,0136,RILEY BLUE WATSON,100,ZAR,0.18,USD,"Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses",Direct Pay
2026-10-03 07:31:10 UTC,card_spend,Yoco   *How Bao Now      ,CLEARED,7.06,USD,0136,RILEY BLUE WATSON,115,ZAR,0.21,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-02 19:07:58 UTC,card_spend,KRONENDAL HOMESTEAD      ,CLEARED,70.81,USD,0136,RILEY BLUE WATSON,1150,ZAR,2.12,USD,Eating Places and Restaurants,Direct Pay
2026-10-02 11:08:29 UTC,card_spend,Advance Gardens Centre   ,CLEARED,0.62,USD,0136,RILEY BLUE WATSON,10,ZAR,0.02,USD,Parking Lots and Garages,Direct Pay
2026-10-02 11:07:39 UTC,card_spend,Absolute Pets Gardens    ,CLEARED,9.17,USD,0136,RILEY BLUE WATSON,149,ZAR,0.28,USD,"Pet Shops, Pet Food, and Supplies",Direct Pay
2026-10-02 10:50:34 UTC,card_spend,SHELL PADDY ' S SERVICE C,CLEARED,34.28,USD,0136,RILEY BLUE WATSON,556.7,ZAR,1.03,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-10-02 08:31:23 UTC,card_spend,H&M V&A Waterfront       ,CLEARED,20.44,USD,0136,RILEY BLUE WATSON,332,ZAR,0.61,USD,Men's and Women's Clothing Stores,Direct Pay
2026-10-02 08:18:40 UTC,card_spend,Kauai Waterfront         ,CLEARED,5.73,USD,0136,RILEY BLUE WATSON,93,ZAR,0.17,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-10-02 08:03:52 UTC,card_spend,CLICKS V&A WATERFRONT    ,CLEARED,13.05,USD,0136,RILEY BLUE WATSON,211.98,ZAR,0.39,USD,Drug Stores and Pharmacies,Direct Pay
2026-10-02 07:45:44 UTC,card_spend,PnP Crp Waterfront       ,CLEARED,96.81,USD,0136,RILEY BLUE WATSON,1572.18,ZAR,2.90,USD,Grocery Stores and Supermarkets,Direct Pay
2026-10-02 05:13:07 UTC,topup,USDT,,1000,USD,,,1000,USDT,,,,
2026-10-01 20:07:52 UTC,card_spend,THE POWER AND THE GLORY  ,CLEARED,12.38,USD,0136,RILEY BLUE WATSON,200,ZAR,0.37,USD,Eating Places and Restaurants,Direct Pay
2026-10-01 12:58:30 UTC,card_spend,GIOVANNIS DELIWORLD      ,CLEARED,7.75,USD,0136,RILEY BLUE WATSON,125,ZAR,0.23,USD,Eating Places and Restaurants,Direct Pay
2026-10-01 08:06:34 UTC,card_spend,BP BUFFELJAGSRIVIER *    ,CLEARED,25.42,USD,0136,RILEY BLUE WATSON,410.43,ZAR,0.76,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-09-30 23:59:59 UTC,affiliate_reward,affiliate_reward,paid,0.14,USD,,,,,,,,
2026-09-30 17:54:27 UTC,affiliate_reward,affiliate_reward,paid,5.00,USD,,,,,,,,
2026-09-30 12:10:14 UTC,card_spend,THE BARN         344002  ,CLEARED,24.83,USD,0136,RILEY BLUE WATSON,400,ZAR,0.75,USD,Eating Places and Restaurants,Direct Pay
2026-09-30 10:55:50 UTC,card_spend,Yoco   *The Local Geor   ,CLEARED,4.6,USD,0136,RILEY BLUE WATSON,74,ZAR,0.14,USD,Eating Places and Restaurants,Direct Pay
2026-09-29 09:52:49 UTC,card_spend,ENGEN ECO STOP           ,CLEARED,36.3,USD,0136,RILEY BLUE WATSON,583,ZAR,1.09,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-09-28 09:57:17 UTC,card_spend,Superspar Heather Park   ,CLEARED,20.92,USD,0136,RILEY BLUE WATSON,336.77,ZAR,0.63,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-28 09:52:55 UTC,card_spend,CAR WASH CLUB    340213  ,CLEARED,6.21,USD,0136,RILEY BLUE WATSON,100,ZAR,0.19,USD,Car Washes,Direct Pay
2026-09-27 13:46:21 UTC,card_spend,BP BUFFELJAGSRIVIER      ,CLEARED,44.82,USD,0136,RILEY BLUE WATSON,718.01,ZAR,1.34,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-09-27 11:55:25 UTC,card_spend,Yoco   *Dirk Ace Recor   ,CLEARED,31.22,USD,0136,RILEY BLUE WATSON,500,ZAR,0.94,USD,"Music Stores-Musical Instruments, Pianos, and Sheet Music",Direct Pay
2026-09-27 09:54:04 UTC,card_spend,PP *Yaga                 ,CLEARED,26.51,USD,0136,RILEY BLUE WATSON,424.6,ZAR,0.80,USD,Miscellaneous General Merchandise,Direct Pay
2026-09-26 11:24:41 UTC,card_spend,THAT BUTCHER GUY         ,CLEARED,8.01,USD,0136,RILEY BLUE WATSON,128.24,ZAR,0.24,USD,Freezer & Locker Meat Provisions,Direct Pay
2026-09-26 10:28:08 UTC,card_spend,Yoco   *HAWS             ,CLEARED,8.74,USD,0136,RILEY BLUE WATSON,140,ZAR,0.26,USD,Charitable and Social Service Organizations,Direct Pay
2026-09-26 10:03:07 UTC,card_spend,WOOLWORTHS               ,CLEARED,0.1,USD,0136,RILEY BLUE WATSON,1.7,ZAR,0.00,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-26 10:02:45 UTC,card_spend,WOOLWORTHS               ,CLEARED,37.34,USD,0136,RILEY BLUE WATSON,598,ZAR,1.12,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-26 09:07:29 UTC,card_spend,MS CARMI         275371  ,CLEARED,17.48,USD,0136,RILEY BLUE WATSON,280,ZAR,0.52,USD,Women's Accessory and Specialty Stores,Direct Pay
2026-09-26 08:28:25 UTC,card_spend,Yoco   *One Fine Day     ,CLEARED,2.49,USD,0136,RILEY BLUE WATSON,40,ZAR,0.07,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-26 08:14:51 UTC,card_spend,Yoco   *Jackies breakf   ,CLEARED,11.55,USD,0136,RILEY BLUE WATSON,185,ZAR,0.35,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-25 13:43:58 UTC,card_spend,Spar Kleinmond           ,CLEARED,33.96,USD,0136,RILEY BLUE WATSON,546.02,ZAR,1.02,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-25 13:27:44 UTC,card_spend,THAT BUTCHER GUY         ,CLEARED,6.79,USD,0136,RILEY BLUE WATSON,109.2,ZAR,0.20,USD,Freezer & Locker Meat Provisions,Direct Pay
2026-09-25 13:20:22 UTC,card_spend,SUIDWES BILTONG          ,CLEARED,8.78,USD,0136,RILEY BLUE WATSON,141.1,ZAR,0.26,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-25 09:39:56 UTC,card_spend,Vida E Caffe - Wembley   ,CLEARED,3.68,USD,0136,RILEY BLUE WATSON,59,ZAR,0.11,USD,Eating Places and Restaurants,Direct Pay
2026-09-25 09:27:35 UTC,card_spend,Vida E Caffe - Wembley   ,CLEARED,4.85,USD,0136,RILEY BLUE WATSON,78,ZAR,0.15,USD,Eating Places and Restaurants,Direct Pay
2026-09-24 10:18:03 UTC,card_spend,Vida E Caffe - Wembley   ,CLEARED,11.82,USD,0136,RILEY BLUE WATSON,189,ZAR,0.35,USD,Eating Places and Restaurants,Direct Pay
2026-09-23 12:28:57 UTC,card_spend,SHELL PADDY ' S SERVICE C,CLEARED,42.37,USD,0136,RILEY BLUE WATSON,677.55,ZAR,1.27,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-09-22 19:38:58 UTC,card_spend,STR PARKING CT 218       ,CLEARED,2.57,USD,0136,RILEY BLUE WATSON,41,ZAR,0.08,USD,Parking Lots and Garages,Direct Pay
2026-09-22 19:30:36 UTC,card_spend,Tomo                     ,CLEARED,18.8,USD,0136,RILEY BLUE WATSON,300,ZAR,0.56,USD,Eating Places and Restaurants,Direct Pay
2026-09-22 11:18:18 UTC,card_spend,Advance Gardens Centre   ,CLEARED,0.63,USD,0136,RILEY BLUE WATSON,10,ZAR,0.02,USD,Parking Lots and Garages,Direct Pay
2026-09-22 11:14:26 UTC,card_spend,WOOLWORTHS               ,CLEARED,13.17,USD,0136,RILEY BLUE WATSON,209.98,ZAR,0.39,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-22 10:52:21 UTC,card_spend,BOOTLEGGER GARDENS CENT  ,CLEARED,12.04,USD,0136,RILEY BLUE WATSON,192,ZAR,0.36,USD,Eating Places and Restaurants,Direct Pay
2026-09-21 17:20:37 UTC,card_spend,Yoco   *Lucky Lou        ,CLEARED,22.53,USD,0136,RILEY BLUE WATSON,360,ZAR,0.68,USD,Eating Places and Restaurants,Direct Pay
2026-09-21 11:04:48 UTC,card_spend,Yoco   *Kleinskys        ,CLEARED,17.28,USD,0136,RILEY BLUE WATSON,276,ZAR,0.52,USD,Eating Places and Restaurants,Direct Pay
2026-09-21 09:54:45 UTC,topup,USDC,,700,USD,,,700,USDC,,,,
2026-09-20 14:51:49 UTC,card_spend,Yoco   *Lucky Lou        ,CLEARED,12.51,USD,0136,RILEY BLUE WATSON,200,ZAR,0.38,USD,Eating Places and Restaurants,Direct Pay
2026-09-20 12:37:54 UTC,card_spend,ANTONY'S ICE CR  159322  ,CLEARED,2.5,USD,0136,RILEY BLUE WATSON,40,ZAR,0.08,USD,Variety Stores,Direct Pay
2026-09-20 10:34:46 UTC,card_spend,Yoco   *Happy420 Afric   ,CLEARED,13.78,USD,0136,RILEY BLUE WATSON,220,ZAR,0.41,USD,Men's and Women's Clothing Stores,Direct Pay
2026-09-19 22:15:55 UTC,card_spend,Yoco   *NY Slice Kloof   ,CLEARED,6.76,USD,0136,RILEY BLUE WATSON,108,ZAR,0.20,USD,Eating Places and Restaurants,Direct Pay
2026-09-19 21:25:41 UTC,card_spend,THE POWER AND THE GLORY  ,CLEARED,4.38,USD,0136,RILEY BLUE WATSON,70,ZAR,0.13,USD,Eating Places and Restaurants,Direct Pay
2026-09-19 09:11:59 UTC,card_spend,STR PARKING CT 35        ,CLEARED,0.9,USD,0136,RILEY BLUE WATSON,14.4,ZAR,0.03,USD,Parking Lots and Garages,Direct Pay
2026-09-19 08:35:20 UTC,card_spend,Yoco   *Arthurs Mini S   ,CLEARED,10.95,USD,0136,RILEY BLUE WATSON,175,ZAR,0.33,USD,Eating Places and Restaurants,Direct Pay
2026-09-19 07:38:55 UTC,card_spend,STR PARKING CT 35        ,CLEARED,1.2,USD,0136,RILEY BLUE WATSON,19.2,ZAR,0.04,USD,Parking Lots and Garages,Direct Pay
2026-09-18 13:45:56 UTC,card_spend,Yoco   *SWEET LIONHEAR   ,CLEARED,5.01,USD,0136,RILEY BLUE WATSON,80,ZAR,0.15,USD,Bakeries,Direct Pay
2026-09-18 13:24:59 UTC,card_spend,Yoco   *PEAK MOVEMENT    ,CLEARED,56.41,USD,0136,RILEY BLUE WATSON,900,ZAR,1.69,USD,"Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses",Direct Pay
2026-09-18 08:59:54 UTC,card_spend,Yoco   *New York Bagel   ,CLEARED,10.2,USD,0136,RILEY BLUE WATSON,162.8,ZAR,0.31,USD,Bakeries,Direct Pay
2026-09-18 08:55:15 UTC,card_spend,STR PARKING CT 217       ,CLEARED,2.57,USD,0136,RILEY BLUE WATSON,41,ZAR,0.08,USD,Parking Lots and Garages,Direct Pay
2026-09-17 12:03:30 UTC,card_spend,ITUMELENG        183410  ,CLEARED,21.93,USD,0136,RILEY BLUE WATSON,350,ZAR,0.66,USD,Men's and Women's Clothing Stores,Direct Pay
2026-09-17 09:05:34 UTC,card_spend,ENGEN ECO STOP           ,CLEARED,44.73,USD,0136,RILEY BLUE WATSON,714.2,ZAR,1.34,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-09-17 08:15:14 UTC,card_spend,Express*SalomonSport     ,CLEARED,219.3,USD,0136,RILEY BLUE WATSON,3499,ZAR,6.58,USD,Professional Services,Direct Pay
2026-09-16 11:42:30 UTC,card_spend,INFERNO HAIR STUDIO      ,CLEARED,13.78,USD,0136,RILEY BLUE WATSON,220,ZAR,0.41,USD,Beauty and Barber Shops,Direct Pay
2026-09-15 12:31:31 UTC,card_spend,THE FAT FISH GEORGE      ,CLEARED,16.04,USD,0136,RILEY BLUE WATSON,255,ZAR,0.48,USD,Eating Places and Restaurants,Direct Pay
2026-09-15 10:22:35 UTC,card_spend,CAR WASH CLUB    340213  ,CLEARED,10.06,USD,0136,RILEY BLUE WATSON,160,ZAR,0.30,USD,Car Washes,Direct Pay
2026-09-14 10:37:09 UTC,card_spend,Superspar Heather Park   ,CLEARED,21.81,USD,0136,RILEY BLUE WATSON,347.19,ZAR,0.65,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-14 07:15:14 UTC,card_spend,DL*Playtomic SA          ,CLEARED,31.51,USD,0136,RILEY BLUE WATSON,499.2,ZAR,0.95,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-09-13 09:10:37 UTC,card_spend,Yoco   *La Petite Moo    ,CLEARED,3.79,USD,0136,RILEY BLUE WATSON,60,ZAR,0.11,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-13 07:54:05 UTC,card_spend,Yoco   *Kleinskys        ,CLEARED,7.26,USD,0136,RILEY BLUE WATSON,115,ZAR,0.22,USD,Eating Places and Restaurants,Direct Pay
2026-09-13 07:50:44 UTC,card_spend,Yoco   *Strawbabies      ,CLEARED,5.36,USD,0136,RILEY BLUE WATSON,85,ZAR,0.16,USD,"Jewelry, Watch, Clock, and Silverware Stores",Direct Pay
2026-09-13 07:48:20 UTC,card_spend,Yoco   *Rooibar Pty Lt   ,CLEARED,3.47,USD,0136,RILEY BLUE WATSON,55,ZAR,0.10,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-12 17:30:18 UTC,card_spend,Yoco   *Pizza Shed       ,CLEARED,22.09,USD,0136,RILEY BLUE WATSON,350,ZAR,0.66,USD,Eating Places and Restaurants,Direct Pay
2026-09-12 08:28:44 UTC,card_spend,FLYSAFAI000000004114369  ,CLEARED,3.47,USD,0136,RILEY BLUE WATSON,55,ZAR,0.10,USD,Travel Agencies,Direct Pay
2026-09-12 07:51:07 UTC,card_spend,Yoco   *Kleinskys        ,CLEARED,8.2,USD,0136,RILEY BLUE WATSON,130,ZAR,0.25,USD,Eating Places and Restaurants,Direct Pay
2026-09-12 07:33:49 UTC,card_spend,Yoco   *Rooibar Pty Lt   ,CLEARED,3.47,USD,0136,RILEY BLUE WATSON,55,ZAR,0.10,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-09-11 10:15:47 UTC,card_spend,Superspar Heather Park   ,CLEARED,8.55,USD,0136,RILEY BLUE WATSON,135,ZAR,0.26,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-09 08:11:57 UTC,card_spend,CLICKS GEORGE            ,CLEARED,13.12,USD,0136,RILEY BLUE WATSON,13.12,USD,0.39,USD,Drug Stores and Pharmacies,Direct Pay
2026-09-08 12:02:28 UTC,card_spend,KAUAI                    ,CLEARED,5.93,USD,0136,RILEY BLUE WATSON,93,ZAR,0.18,USD,Eating Places and Restaurants,Direct Pay
2026-09-08 12:01:16 UTC,card_spend,KAUAI                    ,CLEARED,5.93,USD,0136,RILEY BLUE WATSON,93,ZAR,0.18,USD,Eating Places and Restaurants,Direct Pay
2026-09-07 19:24:08 UTC,card_spend,DL*Playtomic SA          ,CLEARED,6.05,USD,0136,RILEY BLUE WATSON,94.89,ZAR,0.18,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-09-07 12:41:49 UTC,card_spend,DL*Playtomic SA          ,CLEARED,11.61,USD,0136,RILEY BLUE WATSON,182,ZAR,0.35,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-09-07 10:14:29 UTC,card_spend,Superspar Heather Park   ,CLEARED,15.99,USD,0136,RILEY BLUE WATSON,250.67,ZAR,0.48,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-05 15:03:49 UTC,card_spend,Spar Wellington Square   ,CLEARED,14.89,USD,0136,RILEY BLUE WATSON,233.39,ZAR,0.45,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-04 10:33:50 UTC,card_spend,Superspar Heather Park   ,CLEARED,12.02,USD,0136,RILEY BLUE WATSON,188.98,ZAR,0.36,USD,Grocery Stores and Supermarkets,Direct Pay
2026-09-03 14:03:41 UTC,card_refund,DL*Playtomic SA          ,CLEARED,-11.12,USD,0136,RILEY BLUE WATSON,-182,ZAR,0,,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",
2026-09-03 11:39:20 UTC,card_spend,KAUAI                    ,CLEARED,5.9,USD,0136,RILEY BLUE WATSON,93,ZAR,0.18,USD,Eating Places and Restaurants,Direct Pay
2026-09-03 11:20:51 UTC,card_spend,GEORGE TRAFFIC DEPARTMENT,CLEARED,8.88,USD,0136,RILEY BLUE WATSON,140,ZAR,0.27,USD,Government Services,Direct Pay
2026-08-31 12:48:21 UTC,card_spend,Superspar Heather Park   ,CLEARED,36.83,USD,0136,RILEY BLUE WATSON,581.98,ZAR,1.10,USD,Grocery Stores and Supermarkets,Direct Pay
2026-08-30 17:26:14 UTC,card_spend,DL*Playtomic SA          ,CLEARED,9.43,USD,0136,RILEY BLUE WATSON,148.2,ZAR,0.28,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-08-30 10:14:38 UTC,card_spend,DL*Playtomic SA          ,CLEARED,11.52,USD,0136,RILEY BLUE WATSON,182,ZAR,0.35,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-08-29 10:20:08 UTC,card_spend,JOGO PADEL HONEYROCK     ,CLEARED,10.7,USD,0136,RILEY BLUE WATSON,169,ZAR,0.32,USD,Sporting Goods Stores,Direct Pay
2026-08-29 10:19:27 UTC,card_spend,JOGO PADEL HONEYROCK     ,CLEARED,3.28,USD,0136,RILEY BLUE WATSON,3.28,USD,0.10,USD,Sporting Goods Stores,Direct Pay
2026-08-29 10:06:36 UTC,card_spend,DL*Playtomic SA          ,CLEARED,12.34,USD,0136,RILEY BLUE WATSON,195,ZAR,0.37,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-08-27 12:44:07 UTC,card_spend,KAUAI             74990  ,CLEARED,6.38,USD,0136,RILEY BLUE WATSON,100,ZAR,0.19,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-08-26 11:09:15 UTC,card_spend,INFERNO HAIR STUDIO      ,CLEARED,14.04,USD,0136,RILEY BLUE WATSON,220,ZAR,0.42,USD,Beauty and Barber Shops,Direct Pay
2026-08-25 09:58:31 UTC,card_spend,OU MEUL RIVERSDAL        ,CLEARED,2.35,USD,0136,RILEY BLUE WATSON,37,ZAR,0.07,USD,Eating Places and Restaurants,Direct Pay
2026-08-25 09:21:35 UTC,card_spend,SHELL RIVERSDALE SERVICE ,CLEARED,69.9,USD,0136,RILEY BLUE WATSON,1099.21,ZAR,2.10,USD,Service Stations (with or without Ancillary Services),Direct Pay
2026-08-25 05:55:13 UTC,card_spend,DL*Playtomic SA          ,CLEARED,11.51,USD,0136,RILEY BLUE WATSON,182,ZAR,0.35,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-08-23 18:27:40 UTC,card_spend,Yoco   *Only Fools       ,CLEARED,29.68,USD,0136,RILEY BLUE WATSON,467.5,ZAR,0.89,USD,Drinking Places,Direct Pay
2026-08-23 09:54:48 UTC,card_spend,ARNOLD ' S RESTAURANT    ,CLEARED,10.79,USD,0136,RILEY BLUE WATSON,170,ZAR,0.32,USD,Eating Places and Restaurants,Direct Pay
2026-08-23 07:59:29 UTC,card_spend,OK KLOOF STREET          ,CLEARED,11.75,USD,0136,RILEY BLUE WATSON,184.97,ZAR,0.35,USD,Grocery Stores and Supermarkets,Direct Pay
2026-08-22 21:22:45 UTC,card_spend,Yoco   *NY Slice Kloof   ,CLEARED,6.85,USD,0136,RILEY BLUE WATSON,108,ZAR,0.21,USD,Eating Places and Restaurants,Direct Pay
2026-08-22 19:43:59 UTC,card_spend,ARUBA                    ,CLEARED,4.06,USD,0136,RILEY BLUE WATSON,64,ZAR,0.12,USD,Eating Places and Restaurants,Direct Pay
2026-08-22 17:50:34 UTC,card_spend,Yoco   *Happy420 Afric   ,CLEARED,13.97,USD,0136,RILEY BLUE WATSON,220,ZAR,0.42,USD,Men's and Women's Clothing Stores,Direct Pay
2026-08-22 11:01:38 UTC,card_spend,CLICKS V&A WATERFRONT    ,CLEARED,13.3,USD,0136,RILEY BLUE WATSON,13.3,USD,0.40,USD,Drug Stores and Pharmacies,Direct Pay
2026-08-22 10:44:03 UTC,card_spend,Kauai Waterfront         ,CLEARED,4.19,USD,0136,RILEY BLUE WATSON,66,ZAR,0.13,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-08-22 10:16:28 UTC,card_spend,Yoco   *Yens Vietnames   ,CLEARED,16.82,USD,0136,RILEY BLUE WATSON,265,ZAR,0.50,USD,Miscellaneous Food Stores-Convenience Stores and Specialty Markets,Direct Pay
2026-08-22 08:31:02 UTC,card_spend,THE GRID                 ,CLEARED,0.95,USD,0136,RILEY BLUE WATSON,15,ZAR,0.03,USD,"Gift, Card, Novelty, and Souvenir Stores",Direct Pay
2026-08-22 06:47:39 UTC,card_spend,THE GRID                 ,CLEARED,3.18,USD,0136,RILEY BLUE WATSON,50,ZAR,0.10,USD,"Gift, Card, Novelty, and Souvenir Stores",Direct Pay
2026-08-22 06:05:31 UTC,card_spend,Yoco   *Nice To Matcha   ,CLEARED,5.4,USD,0136,RILEY BLUE WATSON,85,ZAR,0.16,USD,Eating Places and Restaurants,Direct Pay
2026-08-21 19:35:41 UTC,card_spend,MAHARAJAH RESTAURANT     ,CLEARED,15.81,USD,0136,RILEY BLUE WATSON,250,ZAR,0.47,USD,Membership Organizations (not elsewhere classified),Direct Pay
2026-08-21 16:15:38 UTC,card_spend,THE POWER AND THE GLORY  ,CLEARED,24.02,USD,0136,RILEY BLUE WATSON,380,ZAR,0.72,USD,Eating Places and Restaurants,Direct Pay
2026-08-21 15:22:14 UTC,card_spend,DL Playtomic SA          ,CLEARED,12,USD,0136,RILEY BLUE WATSON,189.8,ZAR,0.36,USD,"Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters",Direct Pay
2026-08-20 17:52:51 UTC,card_spend,Yoco   *The Mojo Hotel   ,CLEARED,1.59,USD,0136,RILEY BLUE WATSON,25,ZAR,0.05,USD,Drinking Places,Direct Pay
2026-08-20 17:49:56 UTC,card_spend,ASIAN HERBIVORE  347418  ,CLEARED,7.58,USD,0136,RILEY BLUE WATSON,120,ZAR,0.23,USD,Quick Payment Service-Fast Food Restaurants,Direct Pay
2026-08-19 19:54:12 UTC,card_spend,CLARKES BAR AND DI19485  ,CLEARED,12.54,USD,0136,RILEY BLUE WATSON,200,ZAR,0.38,USD,Eating Places and Restaurants,Direct Pay
2026-08-17 20:23:31 UTC,topup,USDT,,1500,USD,,,1500,USDT,,,,
2026-08-08 12:28:07 UTC,card_spend,Giovanni Esposito        ,DECLINED,15.32,USD,0136,RILEY BLUE WATSON,244,ZAR,0,,5812 - Eating Places and Restaurants,
2026-08-02 12:28:09 UTC,card_spend,KwikSpar Wilderness      ,CLEARED,1.79,USD,0136,RILEY BLUE WATSON,28.98,ZAR,0.05,USD,Grocery Stores and Supermarkets,Direct Pay
2026-07-24 14:40:39 UTC,card_spend,iStore Garden Route      ,DECLINED,24.56,USD,0136,RILEY BLUE WATSON,399,ZAR,0,,"5045 - Computers, Computer Peripheral Equipment, and Software ",
2026-07-23 12:12:41 UTC,topup,USDC,,5,USD,,,5,USDC,,,,
`

export async function seedSpendingData() {
  const count = await db.bankTransactions.count()
  if (count > 0) return // already seeded or user has imported data
  const rate = 16.2 // approximate rate at time of these transactions
  try {
    const { transactions } = await parseEtherfiCSV(HISTORICAL_CSV, rate)
    await importTransactions(transactions, 'transaction-history-2026-05-01_to_2026-11-01.csv')
  } catch (e) {
    console.warn('Spending seed failed:', e)
  }
}
