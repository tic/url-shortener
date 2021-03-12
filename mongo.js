const Mongo = new require('mongodb').MongoClient(
    `mongodb+srv://${process.env.MUSR}:${process.env.MPAS}@${process.env.MURL}/<dbName>?retryWrites=true&w=majority`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
    }
);
const Semaphore = new (require('async-mutex').Semaphore)(1);

Mongo.connect(err => {
    if(err) console.log('[MNGO] failed to connect to database');
    else console.log('[MNGO] connected to database');
});

async function shorten(url, iframe, custom) {
    const [_, release] = await Semaphore.acquire();
    try {
        let ins_coll = Mongo.db('conversion').collection('linkmapping');

        if(custom) {
            let exists = (await ins_coll.findOne({short: custom})) || false;
            if(exists) return {err: 'custom short url already exists'}
            var nextID = custom;
        } else {
            let id_coll = Mongo.db('conversion').collection('master');
            var { nextID } = await id_coll.findOne({_id: 'nextID'});
            if(nextID === undefined) return {err: 'failed to retrieve nextID from database'};
            while(true) {
                let exists = (await ins_coll.findOne({short: nextID})) || false;
                if(!exists) break;
                nextID = next(nextID);
            }
            await id_coll.findOneAndUpdate({_id: 'nextID'}, {$set: {nextID: next(nextID)}})
        }

        await ins_coll.insertOne({
            short: nextID,
            url,
            iframe: iframe === true,
        });
        return {
            short: nextID,
            iframe: iframe === true,
        };
    } catch(err) {
        console.log(err);
        return {err: 'failed to shorten long url'}
    } finally {
        release();
    }
}

async function lengthen(scramble) {
    const [_, release] = await Semaphore.acquire();
    try {
        let collection = Mongo.db('conversion').collection('linkmapping');
        let data = await collection.findOne({short: scramble});
        if(!data) return {err: 'short url does not map to anything'}
        return data
    } catch(err) {
        console.log(err);
        return {err: 'failed to lengthen short url'}
    } finally {
        release();
    }
}

const digits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function replaceAt(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
}
function next(id) {
    let extend = true;
    for(let i = id.length - 1; i > -1; i--) {
        extend = false;
        let char = id[i];
        let inc = digits.indexOf(char) + 1;
        id = replaceAt(id, i, digits[inc % 62]);
        if(inc < 62) break;
        extend = true;
    }

    if(extend) return `0${id}`;
    return id;
}

module.exports = {
    shorten,
    lengthen,
}
