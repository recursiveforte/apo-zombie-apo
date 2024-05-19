// @ts-ignore
import factory from 'ggwave'
  var ggwave: any = null;
  var instance: any = null;
  var context: AudioContext | null = null;
  var parameters: any = null;
  export async function init_ggwave() {
    context = new AudioContext({sampleRate: 48000});
    // TODO : handle if that doesn't work

    return await factory().then(function(_ggwave: any) {
      ggwave = _ggwave;
      console.log(ggwave)
      parameters = ggwave.getDefaultParameters();
      parameters.sampleRateInp = context!.sampleRate;
      parameters.sampleRateOut = context!.sampleRate;
      console.log(parameters)
      instance = ggwave.init(parameters);
    });

  }
  // bad!
  function convertTypedArray(src: any, type: any) {
    var buffer = new ArrayBuffer(src.byteLength);
    var baseView = new src.constructor(buffer).set(src);
    return new type(buffer);

  }
  export function send(id: string) {
    // @ts-ignore
    if (navigator.audioSession)
      // @ts-ignore
      navigator.audioSession.type = 'playback' // ios player fix

    var waveform = ggwave.encode(instance, id, 1 /*ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST*/, 10) // TODO: optimize for less sound
    var buf = convertTypedArray(waveform, Float32Array);
    var buffer = context!.createBuffer(1, buf.length, context!.sampleRate);
    buffer.getChannelData(0).set(buf);
    var source = context!.createBufferSource();
    source.buffer = buffer;
    source.connect(context!.destination);
    source.start(0);

    // @ts-ignore
    if (navigator.audioSession)
      // @ts-ignore
      navigator.audioSession.type = 'play-and-record' // ios player fix
  }

  var receive_callback: (id: number) => void;
  var mediaStream: MediaStreamAudioSourceNode;
  var recorder: ScriptProcessorNode;

  // TODO: receive does not work on firefox!
  export function init_receive(receive_callback: (id: number) => void) {
    let constraints = {
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
      }
    };


    navigator.mediaDevices.getUserMedia(constraints).then(function (e) {
      mediaStream = context!.createMediaStreamSource(e);

      var bufferSize = 1024;
      var numberOfInputChannels = 1;
      var numberOfOutputChannels = 1;

        recorder = context!.createScriptProcessor(
          bufferSize,
          numberOfInputChannels,
          numberOfOutputChannels);


      recorder.onaudioprocess = function (e: AudioProcessingEvent) {
        var source = e.inputBuffer;
        var res = ggwave.decode(instance, convertTypedArray(new Float32Array(source.getChannelData(0)), Int8Array));

        if (res && res.length > 0) {
          res = new TextDecoder("utf-8").decode(res);
          receive_callback(res)
        }
      }

      mediaStream.connect(recorder);
      recorder.connect(context!.destination);
    }).catch(function (e) {
      console.error(e);
    });


  }